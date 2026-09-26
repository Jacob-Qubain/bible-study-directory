-- The childcare option was removed from the app. Run after the code that no
-- longer reads this column is deployed, so the live site never breaks.
alter table bible_studies drop column if exists childcare;
