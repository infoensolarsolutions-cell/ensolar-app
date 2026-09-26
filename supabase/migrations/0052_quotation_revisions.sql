-- Quotation revision history: when editing a sent/accepted quotation bumps
-- the revision, the outgoing revision (header + items) is archived here as a
-- JSON snapshot first, so every past revision stays viewable and printable.

create table public.quotation_revisions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  revision_no int not null,
  revision_date date,
  snapshot jsonb not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index quotation_revisions_qidx
  on public.quotation_revisions (quotation_id, revision_no);

alter table public.quotation_revisions enable row level security;

create policy "staff read" on public.quotation_revisions
  for select to authenticated using (public.is_staff());
create policy "staff insert" on public.quotation_revisions
  for insert to authenticated with check (public.is_staff());
create policy "owner delete" on public.quotation_revisions
  for delete to authenticated using (public.get_my_role() = 'owner');
