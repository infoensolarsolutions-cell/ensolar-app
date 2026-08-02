-- Meeting schedules shown on the dashboard agenda. Staff-managed.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  date date not null,
  time text, -- "HH:MM", optional
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index appointments_date_idx on public.appointments (date);

alter table public.appointments enable row level security;
create policy "staff manage appointments" on public.appointments
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
