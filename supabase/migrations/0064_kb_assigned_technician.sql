-- Troubleshooting entries carry the technician who attended/solved the site
-- problem. A tagged technician may edit that entry (not just their own) so
-- they can write up the troubleshooting steps they did on site.

alter table public.kb_issues
  add column assigned_to uuid references public.profiles (id) on delete set null;

drop policy "technician updates own kb" on public.kb_issues;
create policy "technician updates own or assigned kb" on public.kb_issues
  for update to authenticated
  using (
    public.get_my_role() = 'technician'
    and (created_by = (select auth.uid()) or assigned_to = (select auth.uid()))
  )
  with check (
    public.get_my_role() = 'technician'
    and (created_by = (select auth.uid()) or assigned_to = (select auth.uid()))
  );
