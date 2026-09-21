-- Payment history against invoices. A separate ledger (rather than a single
-- "amount_received" column on invoices) so partial payments are individually
-- recorded and auditable — pending/received are always derived by summing this
-- table, never stored redundantly on the invoice itself. Deliberately never
-- surfaced on the invoice PDF (lib/pdf.tsx) or the invoice document itself —
-- only in the vendor/salesman dashboards and the in-app invoice detail view.

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  recorded_by_user_id uuid not null default auth.uid(),
  note text,
  created_at timestamptz not null default now()
);
create index idx_invoice_payments_invoice_id on invoice_payments(invoice_id);

alter table invoice_payments enable row level security;

-- Readable by the vendor (all their invoices) or the salesman who owns the invoice.
create policy invoice_payments_select on invoice_payments for select
  using (
    exists (
      select 1 from invoices i
      where i.id = invoice_payments.invoice_id
        and (is_vendor_owner(i.vendor_id) or i.salesman_id = current_salesman_id())
    )
  );

-- Either the invoice's own salesman or the owning vendor can record a payment
-- against it (a vendor might reconcile/collect directly). Payments are only
-- recorded against synced invoices (real server id), never local drafts.
create policy invoice_payments_insert on invoice_payments for insert
  with check (
    recorded_by_user_id = auth.uid()
    and exists (
      select 1 from invoices i
      where i.id = invoice_id
        and i.status = 'synced'
        and (is_vendor_owner(i.vendor_id) or i.salesman_id = current_salesman_id())
    )
  );

-- No update/delete: a payment ledger is append-only, corrections are a new
-- (negative-adjusting) entry if ever needed, not an edit of history.
