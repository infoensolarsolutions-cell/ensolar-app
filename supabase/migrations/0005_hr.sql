-- Module D step D1: employees + attendance (Spec §6.1).

create type public.rate_type as enum ('daily', 'monthly');

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id),
  name text not null,
  position text,
  rate_type public.rate_type not null default 'daily',
  rate numeric(12,2) not null default 0,
  sss_no text,
  philhealth_no text,
  pagibig_no text,
  hired_at date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id),
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  source text not null default 'self' check (source in ('self', 'admin')),
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now(),
  constraint out_after_in check (clock_out is null or clock_out > clock_in)
);
create index attendance_employee_idx on public.attendance (employee_id, clock_in);

-- Audit trail for admin corrections (Spec §8).
create table public.attendance_edits (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance (id) on delete cascade,
  edited_by uuid references public.profiles (id),
  before jsonb not null,
  after jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id),
  date_from date not null,
  date_to date not null,
  type text not null check (type in ('vacation', 'sick', 'absence', 'other')),
  paid boolean not null default false,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint leave_range check (date_to >= date_from)
);
create index leaves_employee_idx on public.leaves (employee_id, date_from);

create function public.my_employee_id()
returns uuid language sql security definer stable set search_path = ''
as $$
  select id from public.employees where profile_id = (select auth.uid());
$$;

-- Self clock-outs may only fill clock_out on an open entry; owner is free.
create function public.protect_attendance_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.get_my_role() = 'owner' or (select auth.uid()) is null then
    return new;
  end if;
  if old.clock_out is not null then
    raise exception 'already clocked out';
  end if;
  if new.employee_id is distinct from old.employee_id
     or new.clock_in is distinct from old.clock_in
     or new.source is distinct from old.source then
    raise exception 'only clock-out can be set';
  end if;
  return new;
end;
$$;

create trigger protect_attendance_update
  before update on public.attendance
  for each row execute function public.protect_attendance_update();

-- RLS: rates and government numbers are owner-only; employees see their own
-- record and attendance.

alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_edits enable row level security;
alter table public.leaves enable row level security;

create policy "owner full access" on public.employees
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
create policy "read own employee record" on public.employees
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "owner full access" on public.attendance
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
create policy "self read own attendance" on public.attendance
  for select to authenticated using (employee_id = public.my_employee_id());
create policy "self clock in" on public.attendance
  for insert to authenticated
  with check (employee_id = public.my_employee_id() and source = 'self');
create policy "self clock out" on public.attendance
  for update to authenticated
  using (employee_id = public.my_employee_id())
  with check (employee_id = public.my_employee_id());

create policy "owner full access" on public.attendance_edits
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "owner full access" on public.leaves
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
create policy "self read own leaves" on public.leaves
  for select to authenticated using (employee_id = public.my_employee_id());
