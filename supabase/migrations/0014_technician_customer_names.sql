-- Technicians need to know whose job they are on: allow them to read the
-- customer record behind their assigned projects (still no financial data).

create policy "technicians read customers of assigned projects"
  on public.customers
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.customer_id = customers.id
        and public.is_assigned_to_project(p.id)
    )
  );
