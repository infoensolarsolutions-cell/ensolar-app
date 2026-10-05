-- Link each registered equipment unit to its catalog product, so the
-- issue-to-project form can offer tap-to-pick serial selection instead of
-- re-typing (serials are entered once, at stock-in). Backfills existing
-- units from the "(SKU)" suffix the stock-in flow wrote into model.

alter table public.equipment_units
  add column product_id uuid references public.products (id) on delete set null;

create index equipment_units_product_stock_idx
  on public.equipment_units (product_id) where project_id is null;

update public.equipment_units eu
set product_id = p.id
from public.products p
where eu.product_id is null
  and eu.model ilike '%(' || p.sku || ')';
