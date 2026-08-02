-- Installed-system details per project: array size and full equipment record
-- (package type, inverter, panels, battery, warranty, remarks) as jsonb.
-- Populated by the historical import and available for future projects.
alter table public.projects
  add column if not exists system_kwp numeric,
  add column if not exists system_specs jsonb;
