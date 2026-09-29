-- "Nothing fits your schedule?" Students who can't find a study leave their
-- availability for the campus's contacts (e.g. missionaries), who can see
-- when people are free and invite them to something, or start a new study.

-- ─── Campus contacts ─────────────────────────────────────────────────────
-- Leaders (approved accounts) an admin assigns to a campus. Shown publicly
-- on the campus page, and the only people who see that campus's requests.
create table campus_contacts (
  campus_id  uuid not null references campuses (id) on delete cascade,
  leader_id  uuid not null references leaders (id) on delete cascade,
  title      text not null default 'Campus missionary' check (length(title) between 1 and 60),
  sort_order smallint not null default 0,
  primary key (campus_id, leader_id)
);

create index campus_contacts_leader_idx on campus_contacts (leader_id);

alter table campus_contacts enable row level security;

create policy "public reads campus contacts" on campus_contacts
  for select using (true);
create policy "admins manage campus contacts" on campus_contacts
  for all to authenticated using (is_admin()) with check (is_admin());

create function is_campus_contact(p_campus_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from campus_contacts
    where campus_id = p_campus_id and leader_id = current_leader_id()
  )
$$;

-- ─── Study requests ──────────────────────────────────────────────────────
create table study_requests (
  id         uuid primary key default gen_random_uuid(),
  campus_id  uuid not null references campuses (id) on delete cascade,
  name       text not null check (length(name) between 1 and 120),
  email      citext,
  phone      text,
  days       smallint[] not null default '{}'   -- 0 = Sunday … 6 = Saturday
             check (days <@ array[0,1,2,3,4,5,6]::smallint[]),
  times      text[] not null default '{}'
             check (times <@ array['morning','afternoon','evening']),
  message    text check (length(message) <= 1000),
  status     inquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index study_requests_campus_idx on study_requests (campus_id, created_at desc);

alter table study_requests enable row level security;

-- Contacts can only move a request's status (and remove it).
revoke insert, update on study_requests from anon, authenticated;
grant update (status) on study_requests to authenticated;

create policy "contacts read their campus requests" on study_requests
  for select to authenticated using (is_campus_contact(campus_id) or is_admin());
create policy "contacts update their campus requests" on study_requests
  for update to authenticated using (is_campus_contact(campus_id) or is_admin());
create policy "contacts remove their campus requests" on study_requests
  for delete to authenticated using (is_campus_contact(campus_id) or is_admin());

-- Visitors submit through this, like submit_inquiry(): validated and rate-limited.
create function submit_study_request(
  p_campus_id uuid,
  p_name      text,
  p_email     text default null,
  p_phone     text default null,
  p_days      smallint[] default '{}',
  p_times     text[] default '{}',
  p_message   text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from campuses where id = p_campus_id) then
    raise exception 'Campus not found' using errcode = 'P0002';
  end if;

  if (
    select count(*) from study_requests r
    where r.created_at > now() - interval '1 hour'
      and ((p_email is not null and r.email = p_email::citext)
        or (p_phone is not null and r.phone = p_phone))
  ) >= 5 then
    raise exception 'Too many requests' using errcode = 'P0001';
  end if;

  insert into study_requests (campus_id, name, email, phone, days, times, message)
  values (
    p_campus_id, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
    coalesce(p_days, '{}'), coalesce(p_times, '{}'), nullif(trim(p_message), '')
  );
end $$;

revoke all on function submit_study_request from public;
grant execute on function submit_study_request to anon, authenticated;
