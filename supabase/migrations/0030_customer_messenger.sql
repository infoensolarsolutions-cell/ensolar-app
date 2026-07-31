-- Facebook/Messenger name captured on the public inquiry form so staff can
-- reply on Messenger without hunting for the profile.
alter table public.customers add column messenger_name text;
