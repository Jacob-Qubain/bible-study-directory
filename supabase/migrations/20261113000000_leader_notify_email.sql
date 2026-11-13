-- Leaders can have notification emails sent somewhere other than their
-- sign-in address. Kept out of the publicly readable leaders table: only the
-- leader (and the server's service role, to send the emails) can see it.

create table leader_settings (
  leader_id    uuid primary key references leaders (id) on delete cascade,
  notify_email citext check (notify_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

alter table leader_settings enable row level security;

create policy "leaders read their settings" on leader_settings
  for select to authenticated using (leader_id = current_leader_id());
create policy "leaders create their settings" on leader_settings
  for insert to authenticated with check (leader_id = current_leader_id());
create policy "leaders update their settings" on leader_settings
  for update to authenticated
  using (leader_id = current_leader_id()) with check (leader_id = current_leader_id());
