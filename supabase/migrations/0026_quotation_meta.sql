-- Project identity and revision tracking on quotations.
alter table public.quotations
  add column project_name text,
  add column site_location text,
  add column revision_no integer not null default 0,
  add column revision_date date;
