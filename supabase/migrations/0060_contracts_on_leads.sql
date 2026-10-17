-- Site inspection happens at the LEAD stage, before a project exists:
-- documents can now belong to a lead instead of a project.

alter table public.contracts alter column project_id drop not null;
alter table public.contracts add column lead_id uuid references public.leads (id) on delete set null;
create index contracts_lead_idx on public.contracts (lead_id);
