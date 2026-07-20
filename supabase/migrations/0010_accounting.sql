-- Module E: non-project expenses (Spec §6.2). Cash-basis reporting.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default (now() at time zone 'Asia/Manila')::date,
  -- Set when a finalized payroll run auto-records its salaries expense.
  payroll_run_id uuid unique references public.payroll_runs (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (date);

alter table public.expenses enable row level security;

create policy "owner full access" on public.expenses
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
