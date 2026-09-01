-- Optional second supervisor on KPI evaluations: own name, own comments,
-- own sup2 rating column inside the scores JSON (no schema change needed
-- for the ratings themselves).
alter table public.kpi_evaluations
  add column supervisor2_name text,
  add column supervisor2_comments text;
