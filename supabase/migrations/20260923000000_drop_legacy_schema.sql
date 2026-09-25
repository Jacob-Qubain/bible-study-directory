-- Removes the prototype schema created on 2026-09-15 (bible_studies with
-- audience/meeting_time/location columns, leaders, members, …) so the real
-- schema in the next migration can be created. A no-op on a fresh database.

drop table if exists members       cascade;
drop table if exists study_tags    cascade;
drop table if exists study_leaders cascade;
drop table if exists inquiries     cascade;
drop table if exists tags          cascade;
drop table if exists bible_studies cascade;
drop table if exists leaders       cascade;

drop type if exists study_format   cascade;
drop type if exists study_cadence  cascade;
drop type if exists study_status   cascade;
drop type if exists food_provided  cascade;
drop type if exists tag_category   cascade;
drop type if exists inquiry_status cascade;

drop function if exists set_updated_at()   cascade;
drop function if exists current_leader_id() cascade;
drop function if exists is_admin()          cascade;
