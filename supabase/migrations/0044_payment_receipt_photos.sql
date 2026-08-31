-- Multiple receipt/deposit-slip attachments per payment; the legacy single
-- receipt_photo column stays for older rows. (Applied via MCP.)
alter table public.payments add column receipt_photos text[];
