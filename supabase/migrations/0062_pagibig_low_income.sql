-- Pag-IBIG low-income rule (HDMF): 1% employee share at/below P1,500
-- monthly compensation, 2% above. Merged into the existing config so any
-- owner-edited values are kept.
update public.contribution_settings
set config = config || '{"low_income_percent": 1, "low_income_threshold": 1500}'::jsonb
where key = 'pagibig';
