-- Payables: installments can recur monthly, quarterly, semi-annually or
-- annually. After each recorded payment the due date rolls forward by the
-- payable's frequency instead of always one month.

alter table public.payables
  add column payment_frequency text not null default 'monthly'
    check (payment_frequency in ('monthly', 'quarterly', 'semi_annual', 'annual'));
