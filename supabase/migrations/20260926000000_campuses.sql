-- Campuses: every study belongs to one. The directory is browsed per campus
-- at findabiblestudy.org/<campus-slug>.

create table campuses (
  id         uuid primary key default gen_random_uuid(),
  -- Top-level URL segment, so it can't collide with the app's own routes.
  slug       text not null unique
             check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
             check (slug not in ('leader', 'studies', 'auth', 'api', 'admin', 'login', 'about', 'campus', 'campuses')),
  name       text not null unique check (length(name) between 2 and 120),
  city       text check (length(city) <= 120),
  timezone   text not null default 'America/Chicago',
  created_at timestamptz not null default now()
);

alter table campuses enable row level security;

create policy "public reads campuses" on campuses
  for select using (true);
create policy "admins manage campuses" on campuses
  for all to authenticated using (is_admin()) with check (is_admin());

-- Existing studies (the samples, plus anything created before campuses
-- existed) start on a demo campus; move them from the study editor.
insert into campuses (id, slug, name, city)
values ('c0000000-0000-4000-8000-000000000001', 'demo', 'Demo University', 'Sample data')
on conflict do nothing;

alter table bible_studies add column campus_id uuid references campuses (id) on delete restrict;
update bible_studies set campus_id = 'c0000000-0000-4000-8000-000000000001' where campus_id is null;
alter table bible_studies alter column campus_id set not null;
create index bible_studies_campus_idx on bible_studies (campus_id);
