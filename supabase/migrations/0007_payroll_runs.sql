-- Module D step D4: weekly payroll runs (Mon–Sat cutoffs) + payslips.

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint period_order check (period_end >= period_start),
  constraint one_run_per_period unique (period_start)
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id),
  days_worked numeric(5,2) not null default 0,
  gross numeric(12,2) not null default 0,
  sss numeric(12,2) not null default 0,
  philhealth numeric(12,2) not null default 0,
  pagibig numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  advance_deduction numeric(12,2) not null default 0,
  net numeric(12,2) not null default 0,
  detail jsonb,
  created_at timestamptz not null default now(),
  constraint one_slip_per_employee unique (run_id, employee_id)
);

alter table public.payroll_runs enable row level security;
alter table public.payslips enable row level security;

create policy "owner full access" on public.payroll_runs
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "owner full access" on public.payslips
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
create policy "self read own payslips" on public.payslips
  for select to authenticated using (employee_id = public.my_employee_id());

-- Weekly payroll: switch the seeded tax table to the BIR weekly schedule
-- (approximate; owner-verifiable in Payroll Settings).
update public.contribution_settings
set label = 'Withholding Tax (weekly)',
    config = '{
      "brackets": [
        { "over": 0,      "base": 0,        "percent": 0 },
        { "over": 4808,   "base": 0,        "percent": 15 },
        { "over": 7692,   "base": 432.6,    "percent": 20 },
        { "over": 15385,  "base": 1971.2,   "percent": 25 },
        { "over": 38462,  "base": 7740.45,  "percent": 30 },
        { "over": 153846, "base": 42355.65, "percent": 35 }
      ]
    }'
where key = 'tax';
