-- Admins can list a study on someone's behalf. If that person has no account
-- yet, they get an approved leader profile plus an invite keyed by email; the
-- first time they sign in with that email, the profile becomes theirs.

create table leader_invites (
  leader_id  uuid primary key references leaders (id) on delete cascade,
  email      citext not null unique,
  created_at timestamptz not null default now()
);

alter table leader_invites enable row level security;

-- Private: only admins can see who's been invited.
create policy "admins read invites" on leader_invites
  for select to authenticated using (is_admin());
revoke insert, update, delete on leader_invites from anon, authenticated;

-- Returns the leader for this person, creating an approved profile (and an
-- invite, if they've never signed in) when needed.
create function admin_invite_leader(p_name text, p_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email citext := lower(trim(p_email));
  v_user  uuid;
  v_id    uuid;
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email' using errcode = '22023';
  end if;

  -- Already has an account?
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is not null then
    select id into v_id from leaders where auth_user_id = v_user;
    if v_id is null then
      insert into leaders (auth_user_id, name, approved) values (v_user, trim(p_name), true)
      returning id into v_id;
    end if;
    return v_id;
  end if;

  -- Already invited?
  select leader_id into v_id from leader_invites where email = v_email;
  if v_id is not null then
    return v_id;
  end if;

  insert into leaders (name, approved) values (trim(p_name), true) returning id into v_id;
  insert into leader_invites (leader_id, email) values (v_id, v_email);
  return v_id;
end $$;

-- Called after sign-in: links a waiting invite to the signed-in user.
create function claim_leader_invite() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or exists (select 1 from leaders where auth_user_id = auth.uid()) then
    return null;
  end if;
  delete from leader_invites
  where email = lower(auth.email())::citext
  returning leader_id into v_id;
  if v_id is not null then
    update leaders set auth_user_id = auth.uid() where id = v_id and auth_user_id is null;
  end if;
  return v_id;
end $$;

revoke all on function admin_invite_leader, claim_leader_invite from public, anon;
grant execute on function admin_invite_leader, claim_leader_invite to authenticated;
