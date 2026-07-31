-- Per-project activity checklists (inverter installation, T&C, …) ticked by
-- the assigned team. Items are jsonb: [{key, label, done, by, at}].
create table public.project_checklists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  template_key text not null,
  title text not null,
  items jsonb not null,
  remarks text,
  created_by uuid references public.profiles (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_checklists_project_idx on public.project_checklists (project_id);

create trigger set_updated_at before update on public.project_checklists
  for each row execute function public.set_updated_at();

alter table public.project_checklists enable row level security;

create policy "staff manage checklists" on public.project_checklists
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "technicians read assigned checklists" on public.project_checklists
  for select to authenticated using (public.is_assigned_to_project(project_id));
create policy "technicians add assigned checklists" on public.project_checklists
  for insert to authenticated with check (public.is_assigned_to_project(project_id));
create policy "technicians update assigned checklists" on public.project_checklists
  for update to authenticated
  using (public.is_assigned_to_project(project_id))
  with check (public.is_assigned_to_project(project_id));
