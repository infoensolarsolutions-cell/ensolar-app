-- Meeting 5W1H details: who (attendees), where (location), why (purpose),
-- how (format). What = title, When = date/time already exist.
alter table public.appointments
  add column attendees text,
  add column location text,
  add column purpose text,
  add column method text;
