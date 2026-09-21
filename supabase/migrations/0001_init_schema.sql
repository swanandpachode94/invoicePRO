-- InvoicePro initial schema
-- Note: vendors.auth_user_id and vendors.invoice_counter_period are additions beyond the
-- literal spec, required to (a) link a vendor row to its Supabase Auth user for RLS, and
-- (b) track which counting period ("never" / a calendar year / a financial year) the
-- current invoice_counter belongs to, so the atomic increment RPC can reset it correctly
-- without a read-then-write race. See 0003_functions.sql for how it's used.

create extension if not exists pgcrypto;

create table vendors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  vendor_code text unique not null,
  business_name text not null,
  gstin text,
  state text,
  address text,
  logo_url text,
  invoice_prefix text not null default 'INV',
  invoice_reset_rule text not null default 'never'
    check (invoice_reset_rule in ('never', 'yearly', 'financial_year')),
  invoice_counter integer not null default 0,
  invoice_counter_period text,
  created_at timestamptz not null default now()
);

create table salesmen (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  name text not null,
  phone text unique not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'deactivated')),
  created_at timestamptz not null default now()
);
create index idx_salesmen_vendor_id on salesmen(vendor_id);

create table items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  name text not null,
  hsn_code text,
  unit text not null default 'pcs',
  sale_price numeric(12, 2) not null default 0,
  gst_percent numeric(4, 2) not null default 0
    check (gst_percent in (0, 5, 12, 18, 28)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_items_vendor_id on items(vendor_id);

create table retailers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  name text not null,
  gstin text,
  state text,
  phone text,
  created_at timestamptz not null default now()
);
create index idx_retailers_vendor_id on retailers(vendor_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_generated_id uuid unique not null,
  vendor_id uuid not null references vendors(id) on delete cascade,
  salesman_id uuid not null references salesmen(id) on delete cascade,
  retailer_id uuid not null references retailers(id),
  invoice_number text,
  status text not null default 'draft'
    check (status in ('draft', 'synced', 'cancelled')),
  subtotal numeric(12, 2) not null default 0,
  total_gst numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  is_interstate boolean not null default false,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);
create index idx_invoices_vendor_created on invoices(vendor_id, created_at desc);
create index idx_invoices_salesman_id on invoices(salesman_id);
create unique index idx_invoices_vendor_number on invoices(vendor_id, invoice_number)
  where invoice_number is not null;

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  item_id uuid references items(id),
  item_name text not null,
  quantity numeric(12, 2) not null,
  unit_price numeric(12, 2) not null,
  gst_percent numeric(4, 2) not null,
  line_total numeric(12, 2) not null
);
create index idx_invoice_items_invoice_id on invoice_items(invoice_id);

create table invoice_cancellations (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  requested_by uuid not null references salesmen(id),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index idx_invoice_cancellations_invoice_id on invoice_cancellations(invoice_id);
