-- Module F: campaigns with lead attribution + portal announcements (Spec §6.3).

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  cost numeric(12,2) not null default 0,
  start_date date not null default (now() at time zone 'Asia/Manila')::date,
  end_date date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint campaign_range check (end_date is null or end_date >= start_date)
);

alter table public.leads
  add column campaign_id uuid references public.campaigns (id);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;
alter table public.announcements enable row level security;

create policy "staff full access" on public.campaigns
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "staff full access" on public.announcements
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
-- Portal customers see active announcements only.
create policy "customers read active announcements" on public.announcements
  for select to authenticated using (active = true);
