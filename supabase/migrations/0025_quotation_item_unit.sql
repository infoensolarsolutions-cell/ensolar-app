-- Unit of measure per quotation line item (pc, set, lot, meter, roll, …).
alter table public.quotation_items add column unit text;
