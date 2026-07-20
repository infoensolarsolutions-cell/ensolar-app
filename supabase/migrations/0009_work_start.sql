-- Official office hours 8AM–5PM: time before the start never counts;
-- overtime is strictly time worked after the end. Both remain editable.
update public.contribution_settings
set config = config
  || '{"work_start_hour": 8}'::jsonb
  || '{"work_end_hour": 17}'::jsonb
where key = 'work';
