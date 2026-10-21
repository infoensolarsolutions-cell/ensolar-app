-- Estimated savings / return-of-investment carried from the sizing
-- calculator onto the quotation, printed as a highlight box on the PDF.
alter table public.quotations add column roi jsonb;
