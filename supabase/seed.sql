-- Step 8 demo seed (Spec §10): realistic products + sample leads so the
-- owner can explore immediately. Run once in the Supabase SQL Editor.
-- Product inserts are rerun-safe (skip on duplicate SKU); lead inserts are not.

insert into public.products (sku, name, category, unit, selling_price) values
  ('SOL-450M',  '450W Mono Solar Panel',                'Panels',      'pc', 7500),
  ('SOL-550M',  '550W Mono Solar Panel',                'Panels',      'pc', 9500),
  ('INV-3K',    '3kW Hybrid Inverter',                  'Inverters',   'pc', 45000),
  ('INV-5K',    '5kW Hybrid Inverter',                  'Inverters',   'pc', 65000),
  ('BAT-100',   '51.2V 100Ah LiFePO4 Battery',          'Batteries',   'pc', 85000),
  ('CBL-PV6',   'PV Solar Cable 6mm²',                  'Cables',      'm',  95),
  ('BRK-63DC',  '63A DC Circuit Breaker',               'Breakers',    'pc', 850),
  ('CCTV-4CH',  '4-Channel CCTV Kit (4 cameras + DVR)', 'CCTV',        'set', 18500),
  ('FDAS-8Z',   '8-Zone Fire Alarm Control Panel',      'FDAS',        'pc', 32000),
  ('PMP-1500',  '1.5HP Submersible Solar Pump',         'Pumps',       'pc', 55000),
  ('MNT-RAIL',  'Aluminum Mounting Rail 4.2m',          'Accessories', 'pc', 1650)
on conflict (sku) do nothing;

do $$
declare
  v_owner uuid := (select id from public.profiles where role = 'owner' limit 1);
  v_customer uuid;
  v_lead uuid;
begin
  -- 1) Facebook inquiry, follow-up already overdue (shows red on dashboard)
  insert into public.customers (name, phone, email, barangay, source)
  values ('Maria Santos', '0917 555 1001', 'maria.santos@example.com', 'Bantayan, Dumaguete City', 'facebook')
  returning id into v_customer;
  insert into public.leads (customer_id, service_type, status, assigned_to, next_followup_at, notes)
  values (v_customer, 'solar', 'new_inquiry', v_owner, current_date - 2, 'Interested in 3kW hybrid system for her home.')
  returning id into v_lead;
  insert into public.lead_events (lead_id, user_id, event, detail)
  values (v_lead, v_owner, 'created', '{"via":"seed"}');

  -- 2) Phone inquiry, contacted
  insert into public.customers (name, phone, barangay, source)
  values ('Pedro Ramirez', '0928 555 1002', 'Daro, Dumaguete City', 'phone')
  returning id into v_customer;
  insert into public.leads (customer_id, service_type, status, assigned_to, next_followup_at, notes)
  values (v_customer, 'electrical', 'contacted', v_owner, current_date + 2, 'Rewiring of two-storey house; asked for electrician visit.')
  returning id into v_lead;
  insert into public.lead_events (lead_id, user_id, event, detail)
  values (v_lead, v_owner, 'created', '{"via":"seed"}');

  -- 3) Walk-in, site visit scheduled
  insert into public.customers (name, phone, email, address, barangay, source)
  values ('Dumaguete Beach Resort (Ana Lim)', '0935 555 1003', 'frontdesk@dgteresort.example.com', 'Flores Ave.', 'Piapi, Dumaguete City', 'walk_in')
  returning id into v_customer;
  insert into public.leads (customer_id, service_type, status, assigned_to, next_followup_at, notes)
  values (v_customer, 'cctv', 'site_visit_scheduled', v_owner, current_date + 3, '12-camera coverage for resort perimeter and lobby.')
  returning id into v_lead;
  insert into public.lead_events (lead_id, user_id, event, detail)
  values (v_lead, v_owner, 'created', '{"via":"seed"}');

  -- 4) Referral, in negotiation
  insert into public.customers (name, phone, barangay, source, referred_by)
  values ('ABC Farms Inc.', '0917 555 1004', 'Valencia, Negros Oriental', 'referral', 'Engr. Reyes')
  returning id into v_customer;
  insert into public.leads (customer_id, service_type, status, assigned_to, next_followup_at, notes)
  values (v_customer, 'solar_pump', 'negotiation', v_owner, current_date + 1, 'Irrigation pump for banana plantation; comparing with diesel option.')
  returning id into v_lead;
  insert into public.lead_events (lead_id, user_id, event, detail)
  values (v_lead, v_owner, 'created', '{"via":"seed"}');

  -- 5) Internet search, lost on price
  insert into public.customers (name, phone, barangay, source)
  values ('Jose Garcia', '0921 555 1005', 'Sibulan, Negros Oriental', 'internet_search')
  returning id into v_customer;
  insert into public.leads (customer_id, service_type, status, assigned_to, next_followup_at, lost_reason, notes)
  values (v_customer, 'solar', 'lost', v_owner, current_date - 5, 'price', 'Went with a cheaper quote from a Cebu supplier.')
  returning id into v_lead;
  insert into public.lead_events (lead_id, user_id, event, detail)
  values (v_lead, v_owner, 'created', '{"via":"seed"}');
end $$;
