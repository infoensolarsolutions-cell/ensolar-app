-- Personal information + emergency contact for the employees register.
alter table public.employees
  add column address text,
  add column birth_date date,
  add column gender text,
  add column contact_no text,
  add column email text,
  add column emergency_name text,
  add column emergency_relationship text,
  add column emergency_contact_no text,
  add column emergency_address text;
