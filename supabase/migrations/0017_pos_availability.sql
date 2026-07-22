-- "Sell in POS" toggle: products default to being sellable at the counter;
-- project-only materials can opt out. Existing rows get true via the default.

alter table public.products
  add column available_in_pos boolean not null default true;

drop view public.products_with_stock;
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
