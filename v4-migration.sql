-- NEBRIN WEBSITE V4 MIGRATION
-- Dynamic services and admin-controlled document requirements.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text not null default 'Other Services',
  description text not null default '',
  price numeric(14,2),
  processing_time text not null default '',
  required_documents jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

drop policy if exists "public read active services" on public.services;
create policy "public read active services"
on public.services for select
to anon, authenticated
using (
  is_active = true
  or exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "admins insert services" on public.services;
create policy "admins insert services"
on public.services for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "admins update services" on public.services;
create policy "admins update services"
on public.services for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "admins delete services" on public.services;
create policy "admins delete services"
on public.services for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

alter table public.applications
  add column if not exists service_id uuid references public.services(id) on delete set null;

create or replace function public.set_services_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_services_updated_at();

insert into public.services
(name,category,description,price,processing_time,required_documents,is_active)
values
(
  'NIDA Application',
  'Government Services',
  'Support for new NIDA applications and related document preparation.',
  null,
  'Processing time depends on the responsible authority.',
  '[{"name":"Birth Certificate","required":true,"note":""},{"name":"Local Government Introduction Letter","required":true,"note":""},{"name":"Passport Photo","required":true,"note":""}]'::jsonb,
  true
),
(
  'M-Pesa Registration',
  'Mobile Financial Services',
  'Support for M-Pesa customer or business registration requirements.',
  null,
  '1–3 working days',
  '[{"name":"NIDA Copy","required":true,"note":""},{"name":"Passport Photo","required":true,"note":""},{"name":"Business License","required":false,"note":"Required for business registration where applicable."}]'::jsonb,
  true
),
(
  'Lipa Number Registration',
  'Mobile Financial Services',
  'Application support for business payment and Lipa Number services.',
  null,
  '1–5 working days',
  '[{"name":"NIDA Copy","required":true,"note":""},{"name":"Business License","required":true,"note":""},{"name":"TIN Certificate","required":true,"note":""},{"name":"Passport Photo","required":false,"note":""}]'::jsonb,
  true
),
(
  'CRDB Account Opening',
  'Banking Services',
  'Support for preparing and submitting CRDB account opening requirements.',
  null,
  '1–3 working days',
  '[{"name":"NIDA Copy","required":true,"note":""},{"name":"Passport Photo","required":true,"note":""},{"name":"Proof of Address","required":false,"note":"May be requested depending on account type."},{"name":"TIN Certificate","required":false,"note":"Required for some business accounts."}]'::jsonb,
  true
),
(
  'TIN Registration',
  'Government Services',
  'Support for individual and business TIN registration.',
  null,
  'Processing time depends on TRA.',
  '[{"name":"NIDA Copy","required":true,"note":""},{"name":"Passport Photo","required":false,"note":""}]'::jsonb,
  true
),
(
  'Company Registration',
  'Business Services',
  'End-to-end assistance with company registration.',
  null,
  'Processing time depends on BRELA.',
  '[{"name":"Director NIDA Copies","required":true,"note":""},{"name":"Proposed Company Names","required":true,"note":"Provide at least three name options."},{"name":"Director Contact Details","required":true,"note":""}]'::jsonb,
  true
),
(
  'Business Name Registration',
  'Business Services',
  'Registration support for business names and sole proprietorships.',
  null,
  'Processing time depends on BRELA.',
  '[{"name":"NIDA Copy","required":true,"note":""},{"name":"Proposed Business Names","required":true,"note":"Provide at least three name options."}]'::jsonb,
  true
),
(
  'Business License Processing',
  'Business Services',
  'Guidance and document support for business licensing.',
  null,
  'Processing time depends on the local authority.',
  '[{"name":"TIN Certificate","required":true,"note":""},{"name":"Business Registration Certificate","required":true,"note":""},{"name":"Premises Information","required":true,"note":""}]'::jsonb,
  true
),
(
  'Birth Certificate Support',
  'Government Services',
  'Application guidance and document preparation support.',
  null,
  'Processing time depends on RITA.',
  '[{"name":"Parent or Guardian NIDA Copy","required":true,"note":""},{"name":"Birth Notification or Supporting Letter","required":false,"note":""}]'::jsonb,
  true
),
(
  'Website Development',
  'Digital Services',
  'Responsive websites for companies, institutions and entrepreneurs.',
  null,
  'Agreed after project assessment.',
  '[{"name":"Company Profile or Business Information","required":true,"note":""},{"name":"Logo","required":false,"note":""},{"name":"Sample Content or References","required":false,"note":""}]'::jsonb,
  true
),
(
  'Mobile App Development',
  'Digital Services',
  'Modern mobile application design and development solutions.',
  null,
  'Agreed after project assessment.',
  '[{"name":"Project Requirements","required":true,"note":""},{"name":"Logo","required":false,"note":""},{"name":"Reference Screens or Examples","required":false,"note":""}]'::jsonb,
  true
),
(
  'Logo & Graphic Design',
  'Creative Services',
  'Professional logos, posters, flyers and corporate branding.',
  null,
  '1–7 working days',
  '[{"name":"Design Brief","required":true,"note":""},{"name":"Reference Images","required":false,"note":""}]'::jsonb,
  true
)
on conflict (name) do nothing;
