-- Module D step D3: configurable contribution/tax settings + cash advances.
-- Rates are data, not code (Spec §6.1) — the owner edits them in the app.

create table public.contribution_settings (
  key text primary key,
  label text not null,
  config jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- Defaults approximate 2025 PH schedules. VERIFY WITH YOUR ACCOUNTANT and
-- edit in Payroll Settings; nothing recomputes old payslips.
insert into public.contribution_settings (key, label, config) values
  ('sss', 'SSS', '{
    "employee_percent": 5,
    "min_monthly": 5000,
    "max_monthly": 35000
  }'),
  ('philhealth', 'PhilHealth', '{
    "total_percent": 5,
    "employee_share_percent": 50,
    "min_monthly": 10000,
    "max_monthly": 100000
  }'),
  ('pagibig', 'Pag-IBIG', '{
    "employee_percent": 2,
    "max_monthly_compensation": 10000
  }'),
  ('tax', 'Withholding Tax (semi-monthly)', '{
    "brackets": [
      { "over": 0,      "base": 0,        "percent": 0 },
      { "over": 10417,  "base": 0,        "percent": 15 },
      { "over": 16667,  "base": 937.5,    "percent": 20 },
      { "over": 33333,  "base": 4270.7,   "percent": 25 },
      { "over": 83333,  "base": 16770.7,  "percent": 30 },
      { "over": 333333, "base": 91770.7,  "percent": 35 }
    ]
  }');

create table public.cash_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id),
  amount numeric(12,2) not null check (amount > 0),
  repaid numeric(12,2) not null default 0 check (repaid >= 0),
  date date not null default (now() at time zone 'Asia/Manila')::date,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index cash_advances_employee_idx on public.cash_advances (employee_id);

alter table public.contribution_settings enable row level security;
alter table public.cash_advances enable row level security;

create policy "owner full access" on public.contribution_settings
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "owner full access" on public.cash_advances
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
create policy "self read own advances" on public.cash_advances
  for select to authenticated using (employee_id = public.my_employee_id());
