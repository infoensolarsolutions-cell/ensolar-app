-- Self-evaluation: the employee rates their own performance on the same
-- criteria. Employees (linked via employees.profile_id) can read and update
-- their own evaluation row; the app restricts them to the self fields.
alter table public.kpi_evaluations
  add column self_comments text,
  add column self_submitted_at timestamptz;

create policy "employees read own evaluations" on public.kpi_evaluations
  for select to authenticated using (
    exists (
      select 1 from public.employees e
      where e.id = employee_id and e.profile_id = (select auth.uid())
    )
  );
create policy "employees update own evaluations" on public.kpi_evaluations
  for update to authenticated using (
    exists (
      select 1 from public.employees e
      where e.id = employee_id and e.profile_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.employees e
      where e.id = employee_id and e.profile_id = (select auth.uid())
    )
  );
