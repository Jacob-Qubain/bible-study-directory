-- Audience tags for campus life. Retires tags that don't fit a campus
-- directory (their study_tags links cascade away) and adds class-year ones.

delete from tags where slug in ('college', 'young-adults', 'couples', 'parents', 'seniors');

insert into tags (slug, label, category) values
  ('freshmen',      'Freshmen',      'audience'),
  ('upperclassmen', 'Upperclassmen', 'audience'),
  ('grad-students', 'Grad students', 'audience')
on conflict (slug) do nothing;
