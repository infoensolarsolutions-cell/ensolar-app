-- Technicians report progress but no longer change projects themselves;
-- status and every other project field become staff-only at the DB level.
drop policy "technicians update assigned projects" on public.projects;
