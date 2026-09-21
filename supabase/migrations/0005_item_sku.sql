-- Adds an optional SKU to items, for vendors who track their own stock-keeping
-- codes alongside (or instead of) HSN codes. Unique per vendor when set, so two
-- items under the same vendor can't collide, but null (not yet assigned) is fine.

alter table items add column sku text;

create unique index idx_items_vendor_sku on items(vendor_id, sku)
  where sku is not null;
