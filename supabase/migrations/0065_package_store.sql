-- Online package store: solar packages shown on the public landing page
-- (linked from Facebook ads) and the online orders/reservations customers
-- place there. Payment is collected through a payment gateway (PayMongo);
-- orders are written server-side with the service role, so online_orders
-- has no anon policies.

create table public.package_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kw numeric(6, 2),
  headline text,
  details text,                 -- one inclusion per line
  price numeric(12, 2) not null default 0,
  reservation_fee numeric(12, 2) not null default 10000,
  active boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.online_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  offer_id uuid references public.package_offers (id) on delete set null,
  offer_name text not null,
  package_price numeric(12, 2),
  amount numeric(12, 2) not null,          -- the amount collected online
  customer_name text not null,
  phone text not null,
  email text,
  address text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'reserved', 'failed', 'cancelled')),
  provider text,
  provider_session_id text,
  provider_payment_id text,
  paid_at timestamptz,
  lead_id uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  created_at timestamptz not null default now()
);
create index online_orders_status_idx on public.online_orders (status);
create index online_orders_session_idx on public.online_orders (provider_session_id);

alter table public.package_offers enable row level security;
alter table public.online_orders enable row level security;

create policy "anyone reads active offers" on public.package_offers
  for select to anon, authenticated
  using (active or public.is_staff());

create policy "owner manages offers" on public.package_offers
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "staff read orders" on public.online_orders
  for select to authenticated
  using (public.is_staff());

create policy "owner manages orders" on public.online_orders
  for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

-- Starter offers mirroring the standard hybrid packages; the owner sets the
-- real prices and switches each one active in Settings before it goes live.
insert into public.package_offers (name, kw, headline, details, sort) values
  ('3.6kW Hybrid Solar Package', 3.6, 'Starter home backup & savings', '7 x 585W solar panels' || chr(10) || 'Deye 3.6kW hybrid inverter' || chr(10) || '51.2V 314Ah LiFePO4 battery' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 1),
  ('5kW Hybrid Solar Package', 5, 'Most popular for small homes', '9 x 585W solar panels' || chr(10) || 'Deye 5kW hybrid inverter' || chr(10) || '51.2V 314Ah LiFePO4 battery' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 2),
  ('6kW Hybrid Solar Package', 6, 'Comfortable whole-home power', '11 x 585W solar panels' || chr(10) || 'Deye 6kW hybrid inverter' || chr(10) || '51.2V 314Ah LiFePO4 battery' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 3),
  ('8kW Hybrid Solar Package', 8, 'For bigger households', '14 x 585W solar panels' || chr(10) || 'Deye 8kW hybrid inverter' || chr(10) || '2 x 51.2V 314Ah LiFePO4 batteries' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 4),
  ('12kW Hybrid Solar Package', 12, 'Heavy users & small business', '21 x 585W solar panels' || chr(10) || 'Deye 12kW hybrid inverter' || chr(10) || '2 x 51.2V 314Ah LiFePO4 batteries' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 5),
  ('16kW Hybrid Solar Package', 16, 'Commercial-grade power', '28 x 585W solar panels' || chr(10) || 'Deye 16kW hybrid inverter' || chr(10) || '3 x 51.2V 314Ah LiFePO4 batteries' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 6),
  ('18kW Hybrid Solar Package', 18, 'Maximum single-phase capacity', '31 x 585W solar panels' || chr(10) || 'Deye 18kW hybrid inverter' || chr(10) || '3 x 51.2V 314Ah LiFePO4 batteries' || chr(10) || 'Complete mounting & installation' || chr(10) || 'Net metering assistance', 7);
