-- Recycle Bin for quotations: soft delete via deleted_at.
alter table public.quotations add column deleted_at timestamptz;
