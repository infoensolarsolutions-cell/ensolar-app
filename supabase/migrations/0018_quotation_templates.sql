-- Reusable quotation templates ("Start from template" in the builder),
-- seeded with the real 6kW Hybrid package (no RSD).

create table public.quotation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  items jsonb not null,
  terms text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.quotation_templates enable row level security;

create policy "staff full access" on public.quotation_templates
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

insert into public.quotation_templates (name, items, terms) values (
'6kW Hybrid — 7.44kWp, 16kWh LiFePO4 (no RSD)',
$tpl$[
  {"product_id": null, "description": "Deye 6kW Hybrid/On-grid Inverter — colorful touch LCD, IP65, max charge/discharge current 135A, frequency droop control, up to 16 units parallel, 6 time periods for battery charging/discharging, supports storing energy from diesel generator, DC couple and AC couple to retrofit existing solar system", "qty": 1, "unit_price": 56000},
  {"product_id": null, "description": "Nuuko N-type Bifacial Solar PV Module, 620W (NKM620N-132BDR12) — 12 pcs = 7.44kWp total; excellent weak-light performance, anti-PID, certified for extreme wind (2400 Pa) and snow (5400 Pa) loads", "qty": 12, "unit_price": 6800},
  {"product_id": null, "description": "LV Topsun LiFePO4 Battery Gen-4 — 314Ah, 51.2V, 16.08kWh; 15–20 yrs service life, >=6,000 cycles, DOD 90%, 10 years warranty", "qty": 1, "unit_price": 125000},
  {"product_id": null, "description": "Balance of System (BOS) — mounting materials, DC and AC protection, DC and AC wiring materials and accessories, grounding materials", "qty": 1, "unit_price": 92600},
  {"product_id": null, "description": "Support structure for ground mounting of solar panels at roof deck — steel materials (pipes, C-channels, rebars), cement, sand and gravel, waterproofing", "qty": 1, "unit_price": 30000},
  {"product_id": null, "description": "Labor — installation and commissioning", "qty": 1, "unit_price": 77040},
  {"product_id": null, "description": "Mobilization — transportation and other expenses", "qty": 1, "unit_price": 20000}
]$tpl$::jsonb,
$tpl$PAYMENT TERMS: 50% downpayment after signing of the project installation agreement; 30% after delivery of inverter, solar panels and batteries to the job site; 20% after testing and commissioning.
PRICE VALIDITY: Prices are in Philippine Pesos, valid for ten (10) days from date of proposal.
LEAD TIME: Materials available within 2 weeks from purchase order signing (barring delivery disruptions); installation work is about 1 week.
NET METERING: Not included.
WARRANTIES: Deye hybrid inverter — 5 years; Nuuko solar panels — 12 years; LV Topsun LiFePO4 battery Gen-4 — 10 years; installation workmanship — 3 years.
NOTE: This package does not include a rapid shutdown device.$tpl$
);
