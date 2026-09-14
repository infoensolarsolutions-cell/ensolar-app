-- Personnel development records: trainings, seminars, certifications on the
-- employee's 201 file. Owner manages; the employee can see their own.

create table public.employee_trainings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  provider text,
  type text not null default 'training'
    check (type in ('training', 'seminar', 'certification', 'workshop', 'other')),
  date_from date not null,
  date_to date,
  venue text,
  certificate boolean not null default false,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index employee_trainings_emp_idx
  on public.employee_trainings (employee_id, date_from desc);

alter table public.employee_trainings enable row level security;

create policy "owner full access" on public.employee_trainings
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "self read own trainings" on public.employee_trainings
  for select to authenticated using (employee_id = public.my_employee_id());
