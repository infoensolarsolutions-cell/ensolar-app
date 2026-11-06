-- Scanned project documents: signed contracts, permits, certificates and
-- other filled-up paperwork uploaded as PDF/image, parked beside the
-- generated documents of each project (digital copy of the hard file).

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  title text not null,
  mime text,
  size_kb int,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index project_files_project_idx on public.project_files (project_id);

alter table public.project_files enable row level security;

create policy "staff full access" on public.project_files
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "team reads project files" on public.project_files
  for select to authenticated
  using (public.get_my_role() = 'technician');

create policy "technician uploads project files" on public.project_files
  for insert to authenticated
  with check (public.get_my_role() = 'technician');

-- Storage bucket, mirroring project-photos
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "staff and technicians upload project files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and (public.is_staff() or public.get_my_role() = 'technician')
  );

create policy "authenticated read project files"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-files');

create policy "staff delete project files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and public.is_staff());
