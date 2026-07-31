-- Equipment specs per checklist ({brand, model, kw, voltage, phases}) so
-- requirements are generated per the actual inverter being installed.
alter table public.project_checklists add column equipment jsonb;
