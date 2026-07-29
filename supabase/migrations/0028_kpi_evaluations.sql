-- KPI performance evaluations: supervisor ratings by staff, final ratings and
-- finalization by the owner. Employee name/position are snapshotted so office
-- staff (who cannot read the employees table) can still work with evaluations.
create table public.kpi_evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  employee_name text not null,
  employee_position text,
  period text not null,
  supervisor_name text,
  status text not null default 'draft'
    check (status in ('draft', 'supervisor_done', 'final')),
  -- [{key, criterion, weight, sup, mgr}] — one entry per KPI criterion
  scores jsonb not null default '[]'::jsonb,
  supervisor_comments text,
  manager_comments text,
  development_plan text,
  created_by uuid references public.profiles (id),
  finalized_by uuid references public.profiles (id),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kpi_evaluations_employee_idx on public.kpi_evaluations (employee_id, period);

create trigger set_updated_at before update on public.kpi_evaluations
  for each row execute function public.set_updated_at();

alter table public.kpi_evaluations enable row level security;

create policy "staff read evaluations" on public.kpi_evaluations
  for select to authenticated using (public.is_staff());
create policy "staff create evaluations" on public.kpi_evaluations
  for insert to authenticated with check (public.is_staff());
create policy "staff update evaluations" on public.kpi_evaluations
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "owner deletes evaluations" on public.kpi_evaluations
  for delete to authenticated using (public.get_my_role() = 'owner');
