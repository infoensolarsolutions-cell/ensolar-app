-- Office attendance kiosk: employees clock in/out on a shared terminal
-- by typing a personal PIN (hash stored per employee).

alter table public.employees add column pin_hash text;

alter table public.attendance drop constraint attendance_source_check;
alter table public.attendance
  add constraint attendance_source_check
  check (source in ('self', 'admin', 'kiosk'));
