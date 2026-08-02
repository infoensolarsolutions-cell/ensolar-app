-- Deye Cloud monitoring: station link per project, plus server-only storage
-- for the API token and cached station readings. Both tables have RLS enabled
-- with NO policies — only the service role (server) can touch them, so the
-- token is never exposed to clients.
alter table public.projects
  add column deye_station_id text,
  add column deye_station_name text;

create table public.app_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_kv enable row level security;

create table public.deye_cache (
  station_id text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.deye_cache enable row level security;
