-- Row Level Security for InvoicePro.
--
-- Helper functions are SECURITY DEFINER + STABLE so policies can call them without
-- triggering recursive RLS evaluation on vendors/salesmen (they run with the owning
-- role's privileges, which in Supabase's migration role bypasses RLS internally).

create or replace function public.current_vendor_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select id from vendors where auth_user_id = auth.uid()),
    (select vendor_id from salesmen where auth_user_id = auth.uid() and status = 'approved')
  );
$$;

create or replace function public.current_salesman_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from salesmen where auth_user_id = auth.uid();
$$;

create or replace function public.is_vendor_owner(p_vendor_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from vendors where id = p_vendor_id and auth_user_id = auth.uid()
  );
$$;

alter table vendors enable row level security;
alter table salesmen enable row level security;
alter table items enable row level security;
alter table retailers enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table invoice_cancellations enable row level security;

-- vendors: a vendor manages their own row; their approved salesmen may read it
-- (needed for invoice PDFs: logo, GSTIN, invoice prefix, etc).
create policy vendors_select on vendors for select
  using (auth_user_id = auth.uid() or id = current_vendor_id());

create policy vendors_insert on vendors for insert
  with check (auth_user_id = auth.uid());

create policy vendors_update on vendors for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- salesmen: a salesman reads/creates their own row; only the owning vendor can
-- read all of their salesmen or change status (approve/reject/deactivate).
create policy salesmen_select on salesmen for select
  using (auth_user_id = auth.uid() or is_vendor_owner(vendor_id));

create policy salesmen_insert on salesmen for insert
  with check (auth_user_id = auth.uid());

create policy salesmen_update on salesmen for update
  using (is_vendor_owner(vendor_id))
  with check (is_vendor_owner(vendor_id));

-- items: readable by the vendor and their approved salesmen; only the vendor writes.
create policy items_select on items for select
  using (vendor_id = current_vendor_id());

create policy items_insert on items for insert
  with check (is_vendor_owner(vendor_id));

create policy items_update on items for update
  using (is_vendor_owner(vendor_id))
  with check (is_vendor_owner(vendor_id));

-- retailers: readable/creatable by the vendor and their approved salesmen
-- (salesmen quick-add retailers while building an invoice).
create policy retailers_select on retailers for select
  using (vendor_id = current_vendor_id());

create policy retailers_insert on retailers for insert
  with check (vendor_id = current_vendor_id());

create policy retailers_update on retailers for update
  using (vendor_id = current_vendor_id())
  with check (vendor_id = current_vendor_id());

-- invoices: the vendor sees every invoice under them; a salesman sees only their own.
-- Inserts happen through the sync_invoice() RPC (0003_functions.sql), which is
-- SECURITY DEFINER and bypasses this policy after its own authorization check —
-- but the policy is still defined for defense-in-depth / direct-insert attempts.
create policy invoices_select on invoices for select
  using (
    is_vendor_owner(vendor_id)
    or salesman_id = current_salesman_id()
  );

create policy invoices_insert on invoices for insert
  with check (salesman_id = current_salesman_id());

-- No update/delete policy: invoice_number assignment and cancellation both go
-- through SECURITY DEFINER RPCs, never direct client writes.

create policy invoice_items_select on invoice_items for select
  using (
    exists (
      select 1 from invoices i
      where i.id = invoice_items.invoice_id
        and (is_vendor_owner(i.vendor_id) or i.salesman_id = current_salesman_id())
    )
  );

create policy invoice_items_insert on invoice_items for insert
  with check (
    exists (
      select 1 from invoices i
      where i.id = invoice_items.invoice_id
        and i.salesman_id = current_salesman_id()
    )
  );

-- invoice_cancellations: a salesman can request cancellation of their own invoice;
-- only the owning vendor can see and approve/reject (approval is via the
-- review_cancellation() RPC in 0003_functions.sql).
create policy invoice_cancellations_select on invoice_cancellations for select
  using (
    exists (
      select 1 from invoices i
      where i.id = invoice_cancellations.invoice_id
        and (is_vendor_owner(i.vendor_id) or i.salesman_id = current_salesman_id())
    )
  );

create policy invoice_cancellations_insert on invoice_cancellations for insert
  with check (
    requested_by = current_salesman_id()
    and exists (
      select 1 from invoices i
      where i.id = invoice_id and i.salesman_id = current_salesman_id()
    )
  );
