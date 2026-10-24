-- Lets a vendor undo a cancellation decision made by mistake: the request goes
-- back to 'pending' (to be approved/rejected again via review_cancellation),
-- and if it had been approved, the invoice it cancelled becomes active again.
create or replace function public.reopen_cancellation(p_cancellation_id uuid)
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

  select * into v_invoice from invoices where id = v_row.invoice_id for update;

  if not exists (select 1 from vendors where id = v_invoice.vendor_id and auth_user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_row.status = 'pending' then
    return v_row;
  end if;

  -- Only un-cancel the invoice if this request is what cancelled it — another
  -- approved request for the same invoice still stands.
  if v_row.status = 'approved' and not exists (
    select 1 from invoice_cancellations
    where invoice_id = v_row.invoice_id and status = 'approved' and id <> p_cancellation_id
  ) then
    update invoices set status = 'synced' where id = v_row.invoice_id;
  end if;

  update invoice_cancellations set status = 'pending'
    where id = p_cancellation_id
    returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.reopen_cancellation(uuid) to authenticated;
