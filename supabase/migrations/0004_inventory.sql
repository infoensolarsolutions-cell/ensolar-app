-- Module C: inventory + POS foundations (Spec §5.3).

-- Full catalog fields (Module A created the minimal version)
alter table public.products
  add column cost_price numeric(12,2) not null default 0,
  add column reorder_level numeric(12,2) not null default 0,
  add column photo text;

create type public.inventory_txn_type as enum
  ('in', 'sale', 'project_issue', 'ticket_issue', 'adjustment');

-- Signed quantities: stock in positive, stock out negative.
-- Stock on hand = sum(qty) per product.
create table public.inventory_txns (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  type public.inventory_txn_type not null,
  qty numeric(12,2) not null check (qty <> 0),
  unit_cost numeric(12,2) not null default 0,
  supplier text,
  reference_no text,
  reason text,
  ref_table text,
  ref_id uuid,
  date date not null default (now() at time zone 'Asia/Manila')::date,
  user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint adjustment_needs_reason
    check (type <> 'adjustment' or reason is not null),
  constraint stock_in_positive check (type <> 'in' or qty > 0),
  constraint stock_out_negative
    check (type not in ('sale', 'project_issue', 'ticket_issue') or qty < 0)
);
create index inventory_txns_product_idx on public.inventory_txns (product_id, created_at);
create index inventory_txns_type_date_idx on public.inventory_txns (type, date);

create table public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  sale_no text not null unique,
  lines jsonb not null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method public.payment_method not null,
  provider_ref text,
  sold_by uuid references public.profiles (id),
  sold_at timestamptz not null default now()
);
create index pos_sales_sold_at_idx on public.pos_sales (sold_at);

-- Live stock view; security_invoker keeps base-table RLS in force.
create view public.products_with_stock
with (security_invoker = on) as
select
  p.*,
  coalesce(s.on_hand, 0) as on_hand
from public.products p
left join (
  select product_id, sum(qty) as on_hand
  from public.inventory_txns
  group by product_id
) s on s.product_id = p.id;

grant select on public.products_with_stock to authenticated;

-- RLS: inventory is office territory; movements are append-only for staff,
-- only the owner can delete (audit trail, Spec §8).
alter table public.inventory_txns enable row level security;
alter table public.pos_sales enable row level security;

create policy "staff read txns" on public.inventory_txns
  for select to authenticated using (public.is_staff());
create policy "staff insert txns" on public.inventory_txns
  for insert to authenticated with check (public.is_staff());
create policy "owner deletes txns" on public.inventory_txns
  for delete to authenticated using (public.get_my_role() = 'owner');

create policy "staff read sales" on public.pos_sales
  for select to authenticated using (public.is_staff());
create policy "staff insert sales" on public.pos_sales
  for insert to authenticated with check (public.is_staff());
create policy "owner deletes sales" on public.pos_sales
  for delete to authenticated using (public.get_my_role() = 'owner');
