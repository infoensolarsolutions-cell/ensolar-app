-- Troubleshooting Knowledge Base: equipment problems and their solutions,
-- categorized by equipment type and brand. Staff write, whole team reads
-- (technicians use it in the field; no financial data lives here).

create table public.kb_issues (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in
    ('battery', 'gridtie_inverter', 'hybrid_inverter', 'solar_panel',
     'monitoring', 'wiring', 'other')),
  brand text,
  model text,
  problem text not null,
  solution text not null,
  source text,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kb_issues_category_idx on public.kb_issues (category);

create trigger set_updated_at before update on public.kb_issues
  for each row execute function public.set_updated_at();

alter table public.kb_issues enable row level security;

create policy "team reads kb" on public.kb_issues
  for select to authenticated
  using (public.get_my_role() in ('owner', 'office_staff', 'technician'));

create policy "staff write kb" on public.kb_issues
  for insert to authenticated
  with check (public.is_staff());

create policy "staff update kb" on public.kb_issues
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "owner deletes kb" on public.kb_issues
  for delete to authenticated
  using (public.get_my_role() = 'owner');
