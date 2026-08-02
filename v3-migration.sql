-- NEBRIN WEBSITE V3 MIGRATION
-- Adds secure supporting-document uploads, internal notes and quoted fees.

alter table public.applications
  add column if not exists documents jsonb not null default '[]'::jsonb,
  add column if not exists admin_note text not null default '',
  add column if not exists quoted_amount numeric(14,2);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'application-documents',
  'application-documents',
  false,
  5242880,
  array['application/pdf','image/jpeg','image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public upload application documents" on storage.objects;
create policy "public upload application documents"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'application-documents'
  and (storage.foldername(name))[1] like 'NEB-%'
  and lower(storage.extension(name)) in ('pdf','jpg','jpeg','png')
);

drop policy if exists "admins read application documents" on storage.objects;
create policy "admins read application documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
