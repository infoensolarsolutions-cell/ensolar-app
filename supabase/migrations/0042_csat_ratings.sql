-- Customer satisfaction ratings: one per project, given by the customer in
-- the portal after completion. Feeds the monthly CSAT review.

create table public.csat_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.csat_ratings enable row level security;

create policy "customer rates own project" on public.csat_ratings
  for insert to authenticated
  with check (public.is_my_customer_project(project_id));

create policy "customer and staff read ratings" on public.csat_ratings
  for select to authenticated
  using (public.is_my_customer_project(project_id) or public.is_staff());
