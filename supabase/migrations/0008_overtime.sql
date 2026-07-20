-- Overtime: payable hours beyond the regular day at a configurable
-- multiplier, computed from attendance.

alter table public.payslips
  add column ot_hours numeric(6,2) not null default 0,
  add column ot_pay numeric(12,2) not null default 0;

insert into public.contribution_settings (key, label, config) values
  ('work', 'Working Hours & Overtime', '{
    "regular_hours_per_day": 8,
    "unpaid_break_hours": 1,
    "overtime_multiplier_percent": 125
  }')
on conflict (key) do nothing;
