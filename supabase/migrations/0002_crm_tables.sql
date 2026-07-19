-- Step 3: CRM core — customers, leads, quotations, minimal products,
-- placeholder projects, and year-prefixed document numbering (Spec §5.1, §7, §8).

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.service_type as enum
  ('solar', 'electrical', 'cctv', 'fdas', 'solar_pump', 'product_purchase');

create type public.lead_status as enum
  ('new_inquiry', 'contacted', 'site_visit_scheduled', 'quotation_sent',
   'negotiation', 'won', 'lost');

create type public.lead_source as enum
  ('walk_in', 'phone', 'facebook', 'internet_search', 'referral');

create type public.lost_reason as enum
  ('price', 'competitor', 'no_budget', 'no_response', 'other');

create type public.quotation_status as enum
  ('draft', 'sent', 'accepted', 'rejected', 'expired');

create type public.project_status as enum
  ('pending', 'ongoing', 'completed', 'closed');

-- ── Tables ───────────────────────────────────────────────────────────────────

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  barangay text,
  source public.lead_source,
  referred_by text,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  service_type public.service_type not null,
  status public.lead_status not null default 'new_inquiry',
  assigned_to uuid references public.profiles (id),
  next_followup_at date,
  lost_reason public.lost_reason,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lost_needs_reason check (status <> 'lost' or lost_reason is not null)
);

create index leads_status_idx on public.leads (status);
create index leads_assigned_followup_idx on public.leads (assigned_to, next_followup_at);

-- Activity log per lead (status moves, notes). Feeds reports later.
create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid references public.profiles (id),
  event text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index lead_events_lead_idx on public.lead_events (lead_id, created_at);

-- Minimal catalog for quotation line items; Module C adds cost/reorder/etc.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text,
  unit text not null default 'pc',
  selling_price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_no text not null unique,
  lead_id uuid references public.leads (id),
  customer_id uuid not null references public.customers (id),
  status public.quotation_status not null default 'draft',
  valid_until date,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  terms text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotations_customer_idx on public.quotations (customer_id);
create index quotations_status_idx on public.quotations (status);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order int not null default 0
);

create index quotation_items_quotation_idx on public.quotation_items (quotation_id);

-- Placeholder until Module B; unique quotation_id keeps "Accept" idempotent.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_no text not null unique,
  customer_id uuid not null references public.customers (id),
  quotation_id uuid unique references public.quotations (id),
  service_type public.service_type,
  site_address text,
  contract_amount numeric(12,2) not null default 0,
  status public.project_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ── Document numbering: Q-2026-0001, P-2026-0001, … (Spec §8) ────────────────

create table public.doc_counters (
  doc_type text not null,
  year int not null,
  last_no int not null default 0,
  primary key (doc_type, year)
);

create function public.next_doc_no(p_doc_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from (now() at time zone 'Asia/Manila'))::int;
  v_no int;
begin
  insert into public.doc_counters (doc_type, year, last_no)
  values (p_doc_type, v_year, 1)
  on conflict (doc_type, year)
  do update set last_no = public.doc_counters.last_no + 1
  returning last_no into v_no;

  return p_doc_type || '-' || v_year || '-' || lpad(v_no::text, 4, '0');
end;
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────
-- CRM data is staff-only. Customers get scoped portal access in Module B.
-- The public inquiry form inserts through the service-role key, bypassing RLS.

alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.projects enable row level security;
alter table public.doc_counters enable row level security;
-- doc_counters: no policies on purpose — only next_doc_no() touches it.

create policy "staff full access" on public.customers
  for all to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff full access" on public.leads
  for all to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff full access" on public.lead_events
  for all to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff read products" on public.products
  for select to authenticated
  using (public.get_my_role() in ('owner', 'office_staff', 'technician'));

create policy "staff manage products" on public.products
  for insert to authenticated
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff update products" on public.products
  for update to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff full access" on public.quotations
  for all to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff full access" on public.quotation_items
  for all to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

create policy "staff full access" on public.projects
  for all to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'))
  with check (public.get_my_role() in ('owner', 'office_staff'));

-- ── updated_at bookkeeping ───────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();
