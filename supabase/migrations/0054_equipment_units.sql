-- Equipment registry: serialized units (inverters, batteries, panels) with
-- supplier/distributor contact for technical support, and the project each
-- unit was issued to and when. Staff manage; the whole team can read in the
-- field (warranty claims need the serial + supplier).

create table public.equipment_units (
  id uuid primary key default gen_random_uuid(),
  equipment_type text not null check (equipment_type in
    ('inverter', 'battery', 'solar_panel', 'other')),
  brand text,
  model text,
  serial_no text not null,
  supplier text,
  supplier_contact text,
  purchase_date date,
  project_id uuid references public.projects (id) on delete set null,
  issued_date date,
  notes text,
  branch_id uuid references public.branches (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index equipment_units_serial_idx
  on public.equipment_units (lower(serial_no));
create index equipment_units_project_idx on public.equipment_units (project_id);

create trigger set_updated_at before update on public.equipment_units
  for each row execute function public.set_updated_at();

alter table public.equipment_units enable row level security;

create policy "team reads equipment" on public.equipment_units
  for select to authenticated
  using (public.get_my_role() in ('owner', 'office_staff', 'technician'));

create policy "staff write equipment" on public.equipment_units
  for insert to authenticated with check (public.is_staff());

create policy "staff update equipment" on public.equipment_units
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "owner deletes equipment" on public.equipment_units
  for delete to authenticated
  using (public.get_my_role() = 'owner');
