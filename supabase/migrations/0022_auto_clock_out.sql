-- Auto clock-out at office end (5 PM) when an entry is still open at 5:30 PM,
-- flagged for review; office staff may correct clock-outs afterwards.

alter table public.attendance add column auto_clocked_out boolean not null default false;

create policy "office staff read attendance" on public.attendance
  for select to authenticated
  using (public.get_my_role() = 'office_staff');

create policy "office staff correct clock-out" on public.attendance
  for update to authenticated
  using (public.get_my_role() = 'office_staff')
  with check (public.get_my_role() = 'office_staff');

create policy "staff log attendance edits" on public.attendance_edits
  for insert to authenticated
  with check (public.is_staff());

create or replace function public.protect_attendance_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.get_my_role() = 'owner' or (select auth.uid()) is null then
    return new;
  end if;
  if public.get_my_role() = 'office_staff' then
    if new.employee_id is distinct from old.employee_id
       or new.clock_in is distinct from old.clock_in
       or new.source is distinct from old.source then
      raise exception 'office staff may only correct the clock-out time';
    end if;
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

create or replace function public.employee_directory()
returns table (id uuid, name text, employee_position text)
language sql security definer stable set search_path = ''
as $$
  select id, name, position
  from public.employees
  where active = true and public.is_staff()
  order by name;
$$;

create or replace function public.auto_clock_out()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_end int := coalesce(
    (select (config->>'work_end_hour')::int
     from public.contribution_settings where key = 'work'),
    17);
begin
  update public.attendance a
  set clock_out = ((a.clock_in at time zone 'Asia/Manila')::date::timestamp
                   + make_interval(hours => v_end)) at time zone 'Asia/Manila',
      auto_clocked_out = true
  where a.clock_out is null
    and ((a.clock_in at time zone 'Asia/Manila')::date::timestamp
         + make_interval(hours => v_end)) at time zone 'Asia/Manila' > a.clock_in
    and ((a.clock_in at time zone 'Asia/Manila')::date::timestamp
         + make_interval(hours => v_end)) at time zone 'Asia/Manila' < now();
end;
$$;

create extension if not exists pg_cron;

select cron.schedule(
  'auto-clock-out-daily',
  '30 9 * * *',
  'select public.auto_clock_out()'
);
