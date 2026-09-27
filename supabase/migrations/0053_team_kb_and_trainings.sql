-- Team contributions: technicians write to the Troubleshooting knowledge
-- base (edit only their own entries), and every member records trainings/
-- seminars on their own 201 file (and may remove entries they added
-- themselves; owner-added rows stay owner-managed).

drop policy "staff write kb" on public.kb_issues;
create policy "team writes kb" on public.kb_issues
  for insert to authenticated
  with check (public.get_my_role() in ('owner', 'office_staff', 'technician'));

create policy "technician updates own kb" on public.kb_issues
  for update to authenticated
  using (public.get_my_role() = 'technician' and created_by = (select auth.uid()))
  with check (public.get_my_role() = 'technician' and created_by = (select auth.uid()));

create policy "self add own trainings" on public.employee_trainings
  for insert to authenticated
  with check (
    employee_id = public.my_employee_id()
    and created_by = (select auth.uid())
  );

create policy "self delete own added trainings" on public.employee_trainings
  for delete to authenticated
  using (
    employee_id = public.my_employee_id()
    and created_by = (select auth.uid())
  );
