-- Bible Study Directory — schema
--
-- Visitors never sign in. They read the public directory with the anon key and
-- "join" through the submit_inquiry() RPC. Leaders sign in with a magic link,
-- create a profile, and manage only the studies they lead. A leader's studies
-- appear publicly once an admin approves the leader.

create extension if not exists citext;

-- ─── Enums ────────────────────────────────────────────────────────────────
create type study_format   as enum ('in_person', 'online', 'hybrid');
create type study_cadence  as enum ('weekly', 'biweekly');
create type study_status   as enum ('active', 'paused', 'archived');
create type food_provided  as enum ('none', 'snacks', 'meal');
create type tag_category   as enum ('audience', 'topic');
create type inquiry_status as enum ('new', 'contacted', 'joined', 'declined');

-- ─── Leaders ──────────────────────────────────────────────────────────────
-- Email lives in auth.users; leaders are linked by auth_user_id.
create table leaders (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  name          text not null check (length(name) between 1 and 120),
  photo_url     text,
  bio           text check (length(bio) <= 2000),
  -- Public, opt-in: powers the "Text" / "WhatsApp" buttons. Null = hidden.
  public_phone  text,
  whatsapp      boolean not null default false,
  approved      boolean not null default false,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── Studies ──────────────────────────────────────────────────────────────
create table bible_studies (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            text not null check (length(title) between 1 and 120),
  summary          text not null check (length(summary) between 1 and 200), -- one line for cards
  description      text check (length(description) <= 4000),                 -- "what to expect"
  curriculum       text,                                                      -- e.g. "Gospel of Mark"

  -- Schedule, stored as local wall-clock time in the study's timezone.
  day_of_week      smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time       time not null,
  duration_minutes smallint not null default 90 check (duration_minutes between 5 and 720),
  timezone         text not null default 'America/Chicago',
  cadence          study_cadence not null default 'weekly',
  anchor_date      date not null default current_date, -- a date it meets; sets biweekly parity

  -- Where (public, coarse). Exact address / link live in study_private.
  format           study_format not null,
  neighborhood     text,                   -- "Hyde Park"
  location_name    text,                   -- "Maria's living room", "Zoom"

  -- Hospitality
  childcare        boolean not null default false,
  food             food_provided not null default 'none',
  capacity         smallint check (capacity > 0),

  status           study_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index bible_studies_status_idx on bible_studies (status);

-- Revealed to a visitor only when they join, and to the study's leaders.
create table study_private (
  study_id    uuid primary key references bible_studies (id) on delete cascade,
  address     text,
  meeting_url text
);

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

-- ─── Inquiries ("Count me in") ───────────────────────────────────────────
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

-- Publicly listed = active and led by at least one approved leader.
create function is_listed(p_study_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from bible_studies s
    join study_leaders sl on sl.study_id = s.id
    join leaders l on l.id = sl.leader_id
    where s.id = p_study_id and s.status = 'active' and l.approved
  )
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger bible_studies_updated_at
  before update on bible_studies
  for each row execute function set_updated_at();

-- A new study gets its private-details row, and its creator becomes its leader.
create function on_study_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  creator uuid := current_leader_id();
begin
  insert into study_private (study_id) values (new.id) on conflict do nothing;
  if creator is not null then
    insert into study_leaders (study_id, leader_id, role) values (new.id, creator, 'leader')
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger bible_studies_created
  after insert on bible_studies
  for each row execute function on_study_created();

-- ─── Row-Level Security ──────────────────────────────────────────────────
alter table leaders       enable row level security;
alter table bible_studies enable row level security;
alter table study_private enable row level security;
alter table study_leaders enable row level security;
alter table tags          enable row level security;
alter table study_tags    enable row level security;
alter table inquiries     enable row level security;

-- Column privileges: leaders can't approve or promote themselves, and can
-- only move an inquiry's status.
revoke insert, update on leaders from anon, authenticated;
grant insert (auth_user_id, name, photo_url, bio, public_phone, whatsapp) on leaders to authenticated;
grant update (name, photo_url, bio, public_phone, whatsapp) on leaders to authenticated;
revoke update on inquiries from anon, authenticated;
grant update (status) on inquiries to authenticated;

-- leaders
create policy "read approved leaders, yourself, or as admin" on leaders
  for select using (approved or auth_user_id = auth.uid() or is_admin());
create policy "create your own leader profile" on leaders
  for insert to authenticated with check (auth_user_id = auth.uid());
create policy "update your own profile" on leaders
  for update to authenticated
  using (auth_user_id = auth.uid() or is_admin())
  with check (auth_user_id = auth.uid() or is_admin());

-- bible_studies
create policy "read listed studies, or your own" on bible_studies
  for select using (is_listed(id) or leads_study(id) or is_admin());
create policy "leaders create studies" on bible_studies
  for insert to authenticated with check (current_leader_id() is not null);
create policy "leaders update their studies" on bible_studies
  for update to authenticated using (leads_study(id) or is_admin());
create policy "leaders delete their studies" on bible_studies
  for delete to authenticated using (leads_study(id) or is_admin());

-- study_private: never public
create policy "leaders read their private details" on study_private
  for select to authenticated using (leads_study(study_id) or is_admin());
create policy "leaders update their private details" on study_private
  for update to authenticated using (leads_study(study_id) or is_admin());

-- study_leaders: creator is added by trigger; admins manage the rest
create policy "public reads study leaders" on study_leaders
  for select using (true);
create policy "admins manage study leaders" on study_leaders
  for all to authenticated using (is_admin()) with check (is_admin());

-- tags
create policy "public reads tags" on tags
  for select using (true);
create policy "admins manage tags" on tags
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "public reads study tags" on study_tags
  for select using (true);
create policy "leaders tag their studies" on study_tags
  for insert to authenticated with check (leads_study(study_id) or is_admin());
create policy "leaders untag their studies" on study_tags
  for delete to authenticated using (leads_study(study_id) or is_admin());

-- inquiries: visitors go through submit_inquiry()
create policy "leaders read their inquiries" on inquiries
  for select to authenticated using (leads_study(study_id) or is_admin());
create policy "leaders update their inquiries" on inquiries
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
  if not is_listed(p_study_id) then
    raise exception 'Study not found' using errcode = 'P0002';
  end if;

  -- Light abuse guard: 5 inquiries per contact per hour.
  if (
    select count(*) from inquiries i
    where i.created_at > now() - interval '1 hour'
      and ((p_email is not null and i.email = p_email::citext)
        or (p_phone is not null and i.phone = p_phone))
  ) >= 5 then
    raise exception 'Too many requests' using errcode = 'P0001';
  end if;

  insert into inquiries (study_id, name, email, phone, message)
  values (p_study_id, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), nullif(trim(p_message), ''));

  return query
    select sp.address, sp.meeting_url from study_private sp where sp.study_id = p_study_id;
end $$;

revoke all on function submit_inquiry from public;
grant execute on function submit_inquiry to anon, authenticated;

-- ─── Admin ───────────────────────────────────────────────────────────────
create function set_leader_approval(p_leader_id uuid, p_approved boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update leaders set approved = p_approved where id = p_leader_id;
end $$;

-- Leaders with their sign-in email, for the approval queue.
create function admin_list_leaders()
returns table (id uuid, name text, email text, approved boolean, created_at timestamptz, study_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select l.id, l.name, u.email::text, l.approved, l.created_at,
           (select count(*) from study_leaders sl where sl.leader_id = l.id)
    from leaders l
    left join auth.users u on u.id = l.auth_user_id
    order by l.approved, l.created_at desc;
end $$;

revoke all on function set_leader_approval, admin_list_leaders from public, anon;
grant execute on function set_leader_approval, admin_list_leaders to authenticated;
