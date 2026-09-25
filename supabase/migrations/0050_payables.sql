-- Payables: money the company owes — loans, supplier credit, government
-- remittances, rent, owner's obligations. A payable keeps its original
-- amount; payments recorded against it bring the balance down, and the
-- balance/due dates feed the Business KPI warning signals.

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('loan','supplier','government','utility','rent','owner','other')),
  creditor text not null,
  description text,
  original_amount numeric(12,2) not null check (original_amount > 0),
  incurred_date date not null default (now() at time zone 'Asia/Manila')::date,
  -- Next payment due (advanced by a month automatically after each payment
  -- when monthly_amount is set; otherwise the final due date).
  due_date date,
  -- Monthly amortization/installment for recurring obligations.
  monthly_amount numeric(12,2) check (monthly_amount is null or monthly_amount > 0),
  interest_note text,
  branch_id uuid references public.branches (id),
  settled_at date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index payables_due_idx on public.payables (due_date);

create table public.payable_payments (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references public.payables (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default (now() at time zone 'Asia/Manila')::date,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index payable_payments_payable_idx on public.payable_payments (payable_id);

alter table public.payables enable row level security;
alter table public.payable_payments enable row level security;

create policy "owner full access" on public.payables
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "owner full access" on public.payable_payments
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
