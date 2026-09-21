-- RPCs for InvoicePro. All SECURITY DEFINER functions do their own authorization
-- checks against auth.uid() internally, since they bypass RLS by design.

-- Auto-generate a unique VEN-XXXX vendor_code on signup.
create or replace function public.set_vendor_code()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  tries int := 0;
begin
  if new.vendor_code is not null then
    return new;
  end if;
  loop
    candidate := 'VEN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (select 1 from vendors where vendor_code = candidate);
    tries := tries + 1;
    if tries > 20 then
      raise exception 'could not generate unique vendor_code';
    end if;
  end loop;
  new.vendor_code := candidate;
  return new;
end;
$$;

create trigger trg_set_vendor_code
  before insert on vendors
  for each row execute function public.set_vendor_code();

-- Lets an unaffiliated authenticated user (mid salesman-signup) resolve a vendor_code
-- to a vendor id/name, without exposing the full vendor row (RLS would otherwise
-- hide it entirely since they have no relationship to that vendor yet).
create or replace function public.lookup_vendor_by_code(p_code text)
returns table(id uuid, business_name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, business_name from vendors where vendor_code = upper(trim(p_code));
$$;
grant execute on function public.lookup_vendor_by_code(text) to authenticated;

-- Given a reset rule and a timestamp, what "period" bucket does it fall in.
-- 'never' collapses to a constant so the counter never resets.
create or replace function public.invoice_period_key(p_reset_rule text, p_at timestamptz)
returns text
language sql
immutable
as $$
  select case p_reset_rule
    when 'yearly' then to_char(p_at, 'YYYY')
    when 'financial_year' then
      case when extract(month from p_at) >= 4
        then to_char(p_at, 'YYYY') || '-' || to_char(p_at + interval '1 year', 'YY')
        else to_char(p_at - interval '1 year', 'YYYY') || '-' || to_char(p_at, 'YY')
      end
    else 'never'
  end;
$$;

-- The one and only way an invoice_number gets assigned. Atomically increments
-- (and, if the counting period rolled over, resets) vendors.invoice_counter under
-- a row lock, then inserts the invoice + its line items in the same transaction.
-- Idempotent on client_generated_id so retried offline syncs never duplicate.
create or replace function public.sync_invoice(
  p_client_generated_id uuid,
  p_vendor_id uuid,
  p_salesman_id uuid,
  p_retailer_id uuid,
  p_subtotal numeric,
  p_total_gst numeric,
  p_total_amount numeric,
  p_is_interstate boolean,
  p_items jsonb
)
returns invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice invoices;
  v_salesman salesmen;
  v_vendor vendors;
  v_period text;
  v_next_counter integer;
  v_invoice_number text;
begin
  select * into v_invoice from invoices where client_generated_id = p_client_generated_id;
  if found then
    return v_invoice; -- already synced; safe to retry
  end if;

  select * into v_salesman from salesmen
    where id = p_salesman_id and auth_user_id = auth.uid() and status = 'approved';
  if not found then
    raise exception 'not authorized to create an invoice for this salesman';
  end if;

  if v_salesman.vendor_id <> p_vendor_id then
    raise exception 'vendor mismatch';
  end if;

  select * into v_vendor from vendors where id = p_vendor_id for update;
  v_period := invoice_period_key(v_vendor.invoice_reset_rule, now());

  if v_vendor.invoice_counter_period is distinct from v_period then
    update vendors set invoice_counter = 1, invoice_counter_period = v_period
      where id = p_vendor_id
      returning invoice_counter into v_next_counter;
  else
    update vendors set invoice_counter = invoice_counter + 1
      where id = p_vendor_id
      returning invoice_counter into v_next_counter;
  end if;

  v_invoice_number := v_vendor.invoice_prefix || '-' ||
    case when v_period = 'never' then '' else v_period || '-' end ||
    lpad(v_next_counter::text, 5, '0');

  insert into invoices (
    client_generated_id, vendor_id, salesman_id, retailer_id, invoice_number,
    status, subtotal, total_gst, total_amount, is_interstate, synced_at
  ) values (
    p_client_generated_id, p_vendor_id, p_salesman_id, p_retailer_id, v_invoice_number,
    'synced', p_subtotal, p_total_gst, p_total_amount, p_is_interstate, now()
  )
  returning * into v_invoice;

  insert into invoice_items (invoice_id, item_id, item_name, quantity, unit_price, gst_percent, line_total)
  select
    v_invoice.id,
    nullif(elem->>'item_id', '')::uuid,
    elem->>'item_name',
    (elem->>'quantity')::numeric,
    (elem->>'unit_price')::numeric,
    (elem->>'gst_percent')::numeric,
    (elem->>'line_total')::numeric
  from jsonb_array_elements(p_items) as elem;

  return v_invoice;
end;
$$;
grant execute on function public.sync_invoice(uuid, uuid, uuid, uuid, numeric, numeric, numeric, boolean, jsonb) to authenticated;

-- Vendor approves/rejects a pending cancellation request; approval cancels the invoice.
create or replace function public.review_cancellation(p_cancellation_id uuid, p_approve boolean)
returns invoice_cancellations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row invoice_cancellations;
  v_invoice invoices;
begin
  select * into v_row from invoice_cancellations where id = p_cancellation_id for update;
  if not found then
    raise exception 'cancellation request not found';
  end if;

  select * into v_invoice from invoices where id = v_row.invoice_id;

  if not exists (select 1 from vendors where id = v_invoice.vendor_id and auth_user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  update invoice_cancellations
    set status = case when p_approve then 'approved' else 'rejected' end
    where id = p_cancellation_id
    returning * into v_row;

  if p_approve then
    update invoices set status = 'cancelled' where id = v_row.invoice_id;
  end if;

  return v_row;
end;
$$;
grant execute on function public.review_cancellation(uuid, boolean) to authenticated;
