-- Leaders can remove people from their own studies' lists (e.g. duplicates,
-- someone who asked to be taken off). Admins can remove anyone.
create policy "leaders delete their inquiries" on inquiries
  for delete to authenticated using (leads_study(study_id) or is_admin());
