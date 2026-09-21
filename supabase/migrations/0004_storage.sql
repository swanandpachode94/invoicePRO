-- Public bucket for vendor logos, used on invoice PDFs. Files are stored under
-- "<vendor_id>/<filename>" so ownership can be checked from the path alone.

insert into storage.buckets (id, name, public)
values ('vendor-logos', 'vendor-logos', true)
on conflict (id) do nothing;

create policy vendor_logos_public_read on storage.objects for select
  using (bucket_id = 'vendor-logos');

create policy vendor_logos_vendor_write on storage.objects for insert
  with check (
    bucket_id = 'vendor-logos'
    and (storage.foldername(name))[1] = (select id::text from vendors where auth_user_id = auth.uid())
  );

create policy vendor_logos_vendor_update on storage.objects for update
  using (
    bucket_id = 'vendor-logos'
    and (storage.foldername(name))[1] = (select id::text from vendors where auth_user_id = auth.uid())
  );
