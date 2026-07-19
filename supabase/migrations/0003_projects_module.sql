-- Module B: projects, progress payments, costing, after-sales (Spec §5.2).
-- One migration for all Module B tables; UI arrives across steps B1–B5.

-- ── Project record extensions ────────────────────────────────────────────────

alter table public.projects
  add column start_date date,
  add column target_date date,
  add column completed_date date,
  add column updated_at timestamptz not null default now();

create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_assignments (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

-- Timeline: status changes, payments, notes, photos (Spec §5.2).
create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references public.profiles (id),
  event text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index project_events_project_idx on public.project_events (project_id, created_at);

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  caption text,
  phase text not null default 'during' check (phase in ('before', 'during', 'after')),
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index project_photos_project_idx on public.project_photos (project_id);

-- ── Progress payments ────────────────────────────────────────────────────────

create table public.payment_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null,
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index payment_milestones_project_idx on public.payment_milestones (project_id);

create type public.payment_method as enum
  ('cash', 'gcash', 'maya', 'bank_transfer', 'check', 'card', 'online');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  or_no text not null unique,
  project_id uuid references public.projects (id),
  milestone_id uuid references public.payment_milestones (id),
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null,
  provider_ref text,
  receipt_photo text,
  notes text,
  received_by uuid references public.profiles (id),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index payments_project_idx on public.payments (project_id);

-- ── Project costing → gross profit ───────────────────────────────────────────

create type public.cost_type as enum
  ('materials', 'labor', 'transportation', 'permits', 'subcontractor', 'other');

create table public.project_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.cost_type not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default (now() at time zone 'Asia/Manila')::date,
  inventory_txn_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index project_costs_project_idx on public.project_costs (project_id);

-- ── After-sales ──────────────────────────────────────────────────────────────

create type public.ticket_status as enum ('open', 'in_progress', 'resolved');

create table public.service_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique,
  project_id uuid not null references public.projects (id),
  reported_at timestamptz not null default now(),
  problem text not null,
  diagnosis text,
  action_taken text,
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles (id),
  warranty boolean not null default true,
  payment_id uuid references public.payments (id),
  resolved_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index service_tickets_project_idx on public.service_tickets (project_id);
create index service_tickets_status_idx on public.service_tickets (status);

create table public.maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'dismissed')),
  note text,
  created_at timestamptz not null default now()
);
create index maintenance_reminders_due_idx on public.maintenance_reminders (status, due_date);

-- ── Customer portal linkage ──────────────────────────────────────────────────

alter table public.customers
  add column profile_id uuid unique references public.profiles (id);

-- ── Helpers for RLS ──────────────────────────────────────────────────────────

create function public.is_staff()
returns boolean language sql security definer stable set search_path = ''
as $$
  select public.get_my_role() in ('owner', 'office_staff');
$$;

create function public.is_assigned_to_project(p_project_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1 from public.project_assignments
    where project_id = p_project_id and user_id = (select auth.uid())
  );
$$;

create function public.is_my_customer_project(p_project_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.customers c on c.id = p.customer_id
    where p.id = p_project_id and c.profile_id = (select auth.uid())
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.project_assignments enable row level security;
alter table public.project_events enable row level security;
alter table public.project_photos enable row level security;
alter table public.payment_milestones enable row level security;
alter table public.payments enable row level security;
alter table public.project_costs enable row level security;
alter table public.service_tickets enable row level security;
alter table public.maintenance_reminders enable row level security;

-- projects: extend access beyond office staff
create policy "technicians read assigned projects" on public.projects
  for select to authenticated
  using (public.is_assigned_to_project(id));

create policy "technicians update assigned projects" on public.projects
  for update to authenticated
  using (public.is_assigned_to_project(id))
  with check (public.is_assigned_to_project(id));

create policy "customers read own projects" on public.projects
  for select to authenticated
  using (public.is_my_customer_project(id));

create policy "staff full access" on public.project_assignments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "technicians read own assignments" on public.project_assignments
  for select to authenticated using (user_id = (select auth.uid()));

create policy "staff full access" on public.project_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "technicians read assigned events" on public.project_events
  for select to authenticated using (public.is_assigned_to_project(project_id));
create policy "technicians log on assigned" on public.project_events
  for insert to authenticated with check (public.is_assigned_to_project(project_id));
create policy "customers read own project events" on public.project_events
  for select to authenticated using (public.is_my_customer_project(project_id));

create policy "staff full access" on public.project_photos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "technicians manage photos on assigned" on public.project_photos
  for all to authenticated
  using (public.is_assigned_to_project(project_id))
  with check (public.is_assigned_to_project(project_id));
create policy "customers view own photos" on public.project_photos
  for select to authenticated using (public.is_my_customer_project(project_id));

create policy "staff full access" on public.payment_milestones
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "customers view own milestones" on public.payment_milestones
  for select to authenticated using (public.is_my_customer_project(project_id));

-- payments: append-only for staff; only owner may delete mistakes (audit trail)
create policy "staff read payments" on public.payments
  for select to authenticated using (public.is_staff());
create policy "staff record payments" on public.payments
  for insert to authenticated with check (public.is_staff());
create policy "owner deletes payments" on public.payments
  for delete to authenticated using (public.get_my_role() = 'owner');
create policy "customers view own payments" on public.payments
  for select to authenticated
  using (project_id is not null and public.is_my_customer_project(project_id));

create policy "staff full access" on public.project_costs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff full access" on public.service_tickets
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "technicians read assigned tickets" on public.service_tickets
  for select to authenticated using (assigned_to = (select auth.uid()));
create policy "technicians update assigned tickets" on public.service_tickets
  for update to authenticated
  using (assigned_to = (select auth.uid()))
  with check (assigned_to = (select auth.uid()));
create policy "customers view own tickets" on public.service_tickets
  for select to authenticated using (public.is_my_customer_project(project_id));

create policy "staff full access" on public.maintenance_reminders
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Storage bucket for site photos ───────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

create policy "staff and technicians upload project photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-photos'
    and (public.is_staff() or public.get_my_role() = 'technician')
  );

create policy "authenticated read project photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-photos');

create policy "staff delete project photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-photos' and public.is_staff());
