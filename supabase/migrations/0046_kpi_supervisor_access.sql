-- Supervisors could not see evaluations assigned to them: they were stored
-- as free-text names with no link to a login, and RLS only admitted staff
-- and the evaluated employee. Link supervisors by employee id and grant
-- them read/update on exactly their assigned evaluations.

alter table public.kpi_evaluations
  add column supervisor_employee_id uuid references public.employees (id),
  add column supervisor2_employee_id uuid references public.employees (id);

-- Backfill from the names already on file (exact matches only).
update public.kpi_evaluations k
  set supervisor_employee_id = e.id
  from public.employees e
  where k.supervisor_name is not null and e.name = k.supervisor_name;
update public.kpi_evaluations k
  set supervisor2_employee_id = e.id
  from public.employees e
  where k.supervisor2_name is not null and e.name = k.supervisor2_name;

create policy "supervisors read assigned evaluations" on public.kpi_evaluations
  for select to authenticated using (
    supervisor_employee_id = public.my_employee_id()
    or supervisor2_employee_id = public.my_employee_id()
  );

create policy "supervisors update assigned evaluations" on public.kpi_evaluations
  for update to authenticated using (
    supervisor_employee_id = public.my_employee_id()
    or supervisor2_employee_id = public.my_employee_id()
  ) with check (
    supervisor_employee_id = public.my_employee_id()
    or supervisor2_employee_id = public.my_employee_id()
  );
