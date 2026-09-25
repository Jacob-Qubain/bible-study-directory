-- Bible Study Directory — initial schema
--
-- Visitors never sign in. They read the public directory with the anon key and
-- "join" through the submit_inquiry() RPC. Leaders sign in with a magic link
-- (Supabase Auth) and manage only the studies they lead.

create extension if not exists citext;

-- ─── Enums ────────────────────────────────────────────────────────────────
create type study_format   as enum ('in_person', 'online', 'hybrid');
create type study_cadence  as enum ('weekly', 'biweekly');
create type study_status   as enum ('active', 'paused', 'archived');
create type food_provided  as enum ('none', 'snacks', 'meal');
create type tag_category   as enum ('audience', 'topic');
create type inquiry_status as enum ('new', 'contacted', 'joined', 'declined');

-- ─── Leaders ──────────────────────────────────────────────────────────────
create table leaders (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  name          text not null,
  photo_url     text,
  bio           text,
  -- Private: used for magic-link sign-in and inquiry notifications.
  email         citext unique,
  -- Public, opt-in: powers the "Text" / "WhatsApp" buttons. Null = hidden.
  public_phone  text,
  whatsapp      boolean not null default false,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── Studies ──────────────────────────────────────────────────────────────
create table bible_studies (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            text not null,
  summary          text not null,          -- one line for cards
  description      text,                   -- "what to expect"
  curriculum       text,                   -- e.g. "Gospel of Mark"

  -- Schedule, stored as local wall-clock time in the study's timezone.
  day_of_week      smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time       time not null,
  duration_minutes smallint not null default 90 check (duration_minutes > 0),
  timezone         text not null default 'America/Chicago',
  cadence          study_cadence not null default 'weekly',
  anchor_date      date not null default current_date, -- a date it meets; sets biweekly parity

  -- Where
  format           study_format not null,
  neighborhood     text,                   -- public, coarse ("Hyde Park")
  location_name    text,                   -- public ("Maria's living room", "Zoom")
  address          text,                   -- private until someone joins
  meeting_url      text,                   -- private until someone joins

  -- Hospitality
  childcare        boolean not null default false,
  food             food_provided not null default 'none',
  capacity         smallint check (capacity > 0),

  status           study_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index bible_studies_status_idx on bible_studies (status);
create index bible_studies_day_idx on bible_studies (day_of_week);

create table study_leaders (
  study_id   uuid not null references bible_studies (id) on delete cascade,
  leader_id  uuid not null references leaders (id) on delete cascade,
  role       text not null default 'leader' check (role in ('leader', 'co_leader', 'host')),
  sort_order smallint not null default 0,
  primary key (study_id, leader_id)
);

create index study_leaders_leader_idx on study_leaders (leader_id);

-- ─── Tags (audience + topic) ─────────────────────────────────────────────
create table tags (
  id       uuid primary key default gen_random_uuid(),
  slug     text not null unique,
  label    text not null,
  category tag_category not null
);

create table study_tags (
  study_id uuid not null references bible_studies (id) on delete cascade,
  tag_id   uuid not null references tags (id) on delete cascade,
  primary key (study_id, tag_id)
);

create index study_tags_tag_idx on study_tags (tag_id);

-- ─── Inquiries ("I'd like to join") ──────────────────────────────────────
create table inquiries (
  id         uuid primary key default gen_random_uuid(),
  study_id   uuid not null references bible_studies (id) on delete cascade,
  name       text not null check (length(name) between 1 and 120),
  email      citext,
  phone      text,
  message    text check (length(message) <= 1000),
  status     inquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index inquiries_study_idx on inquiries (study_id, created_at desc);

-- ─── updated_at trigger ──────────────────────────────────────────────────
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger bible_studies_updated_at
  before update on bible_studies
  for each row execute function set_updated_at();

-- ─── Helpers ─────────────────────────────────────────────────────────────
create function current_leader_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from leaders where auth_user_id = auth.uid()
$$;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from leaders where auth_user_id = auth.uid()), false)
$$;

create function leads_study(p_study_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from study_leaders
    where study_id = p_study_id and leader_id = current_leader_id()
  )
$$;

-- ─── Row-Level Security ──────────────────────────────────────────────────
alter table leaders       enable row level security;
alter table bible_studies enable row level security;
alter table study_leaders enable row level security;
alter table tags          enable row level security;
alter table study_tags    enable row level security;
alter table inquiries     enable row level security;

-- Column-level privileges keep private fields (leader email, study address,
-- meeting link) out of the public API even though the rows are readable.
revoke all on leaders, bible_studies from anon;
grant select (id, name, photo_url, bio, public_phone, whatsapp) on leaders to anon;
grant select (
  id, slug, title, summary, description, curriculum,
  day_of_week, start_time, duration_minutes, timezone, cadence, anchor_date,
  format, neighborhood, location_name, childcare, food, capacity, status
) on bible_studies to anon;
grant select on study_leaders, tags, study_tags to anon;
revoke all on inquiries from anon; -- visitors go through submit_inquiry()

-- Public reads
create policy "public reads leaders" on leaders
  for select using (true);
create policy "public reads active studies" on bible_studies
  for select using (status = 'active' or leads_study(id) or is_admin());
create policy "public reads study leaders" on study_leaders
  for select using (true);
create policy "public reads tags" on tags
  for select using (true);
create policy "public reads study tags" on study_tags
  for select using (true);

-- Leaders manage their own profile and studies
create policy "leader updates self" on leaders
  for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy "leader creates studies" on bible_studies
  for insert to authenticated with check (current_leader_id() is not null);
create policy "leader updates own studies" on bible_studies
  for update to authenticated using (leads_study(id) or is_admin());
create policy "leader deletes own studies" on bible_studies
  for delete to authenticated using (leads_study(id) or is_admin());

create policy "leader manages own study leaders" on study_leaders
  for all to authenticated
  using (leads_study(study_id) or is_admin())
  with check (leads_study(study_id) or is_admin() or leader_id = current_leader_id());
create policy "leader manages own study tags" on study_tags
  for all to authenticated
  using (leads_study(study_id) or is_admin())
  with check (leads_study(study_id) or is_admin());

create policy "leader reads own inquiries" on inquiries
  for select to authenticated using (leads_study(study_id) or is_admin());
create policy "leader updates own inquiries" on inquiries
  for update to authenticated using (leads_study(study_id) or is_admin());

-- ─── Anonymous join ──────────────────────────────────────────────────────
-- Records an inquiry and hands back the private meeting details, so a visitor
-- who says "I'm coming" immediately knows where to go. No account needed.
create function submit_inquiry(
  p_study_id uuid,
  p_name     text,
  p_email    text default null,
  p_phone    text default null,
  p_message  text default null
) returns table (address text, meeting_url text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from bible_studies where id = p_study_id and status = 'active') then
    raise exception 'Study not found' using errcode = 'P0002';
  end if;

  -- Light abuse guard: 5 inquiries per contact per hour.
  if (
    select count(*) from inquiries
    where created_at > now() - interval '1 hour'
      and ((p_email is not null and email = p_email::citext)
        or (p_phone is not null and phone = p_phone))
  ) >= 5 then
    raise exception 'Too many requests' using errcode = 'P0001';
  end if;

  insert into inquiries (study_id, name, email, phone, message)
  values (p_study_id, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), nullif(trim(p_message), ''));

  return query
    select s.address, s.meeting_url from bible_studies s where s.id = p_study_id;
end $$;

revoke all on function submit_inquiry from public;
grant execute on function submit_inquiry to anon, authenticated;
