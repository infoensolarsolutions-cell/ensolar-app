-- Multi-branch foundation: a branch registry, a branch tag on the
-- operational tables (backfilled to the main branch), and a home branch on
-- profiles. Payments, milestones, costs and tickets derive their branch
-- from their project; attendance derives from the employee.

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{2,8}$'),
  name text not null,
  address text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.branches enable row level security;
create policy "authenticated read branches" on public.branches
  for select to authenticated using (true);
create policy "owner manages branches" on public.branches
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

insert into public.branches (code, name, address, phone) values
  ('MAIN', 'Dumaguete (Main)',
   '19 Espina Road, Taclobo, Dumaguete City 6200, Negros Oriental',
   '(035) 531-6455');

-- Branch tag on branch-owned tables, everything existing = MAIN.
alter table public.projects add column branch_id uuid references public.branches (id);
alter table public.leads add column branch_id uuid references public.branches (id);
alter table public.quotations add column branch_id uuid references public.branches (id);
alter table public.expenses add column branch_id uuid references public.branches (id);
alter table public.pos_sales add column branch_id uuid references public.branches (id);
alter table public.inventory_txns add column branch_id uuid references public.branches (id);
alter table public.employees add column branch_id uuid references public.branches (id);
alter table public.profiles add column branch_id uuid references public.branches (id);

update public.projects set branch_id = (select id from public.branches where code = 'MAIN');
update public.leads set branch_id = (select id from public.branches where code = 'MAIN');
update public.quotations set branch_id = (select id from public.branches where code = 'MAIN');
update public.expenses set branch_id = (select id from public.branches where code = 'MAIN');
update public.pos_sales set branch_id = (select id from public.branches where code = 'MAIN');
update public.inventory_txns set branch_id = (select id from public.branches where code = 'MAIN');
update public.employees set branch_id = (select id from public.branches where code = 'MAIN');

create index projects_branch_idx on public.projects (branch_id);
create index leads_branch_idx on public.leads (branch_id);
create index quotations_branch_idx on public.quotations (branch_id);
create index expenses_branch_idx on public.expenses (branch_id);
