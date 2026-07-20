-- Installation Agreement generator: owner-editable template + per-project
-- contracts (auto-filled from quotation/milestones, editable, PDF).

create table public.doc_templates (
  key text primary key,
  title text not null,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_no text not null unique,
  project_id uuid not null references public.projects (id),
  body text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_project_idx on public.contracts (project_id);

create trigger set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.doc_templates enable row level security;
alter table public.contracts enable row level security;

create policy "staff read templates" on public.doc_templates
  for select to authenticated using (public.is_staff());
create policy "owner edits templates" on public.doc_templates
  for update to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "staff full access" on public.contracts
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

insert into public.doc_templates (key, title, body) values
('solar_contract', 'Solar PV System Installation Agreement', $tpl$SOLAR PV SYSTEM INSTALLATION AGREEMENT

SALES AGREEMENT made this {{DATE_LONG}} by and between:

ENSOLAR SOLUTIONS Installation Services., a sole proprietorship business, duly registered with the Department of Trade and Industry on May 11, 2017 and June 3, 2022 under Certificate No. 04741957, registered with the Bureau of Internal Revenue, TIN: 182-500-917-000 on October 06, 2020, and with Dumaguete City Mayor's Permit No. 2026-0704610000-5164, issued on March 25, 2026. Ensolar Solutions Installation Services Office is located at 19-Ciriaco Espina Street, Barangay Taclobo, Dumaguete City, Negros Oriental, Philippines, represented herein by ENGR. LORENZO G. ESPINA, hereinafter referred to as the "FIRST PARTY",

and

{{CUSTOMER_NAME}}, of legal age, and resident of {{CUSTOMER_ADDRESS}}, hereinafter referred to as "SECOND PARTY";

WITNESSETH: THAT

WHEREAS, the FIRST PARTY is a Registered Electrical Engineer and a Certified Installer of Solar PV System equipment like solar pv modules, battery banks, inverters, solar equipment and accessories, and offers to sell to the SECOND PARTY.

WHEREAS, the SECOND PARTY desires to purchase and commission from the FIRST PARTY aforesaid fully installed Solar PV System Package at {{CUSTOMER_ADDRESS}} specifically described as "{{SYSTEM_DESCRIPTION}}".

NOW THEREFORE, for and in consideration of the mutual terms, conditions and covenants hereinafter set forth SELLER and BUYER agree as follows:

1. The First Party shall sell to the Second Party and install the {{SYSTEM_DESCRIPTION}}.

2. The Second Party shall purchase from the First Party the aforesaid Solar PV System Equipment described below as to Name, Brand, Quantity and Specifications:

{{EQUIPMENT_LIST}}

3. The First Party submitted to the Second Party the proposed Solar PV System in reference to Quotation {{QUOTE_NO}} submitted on {{QUOTE_DATE}}, which forms part and parcel of this Installation Agreement.

4. The total purchase price of the Solar Energy Package is {{TOTAL_WORDS}} (Php {{TOTAL_FIGURES}}) payable by the following scheme:

Cash or check payable to LORENZO G. ESPINA

Bank Accounts:

METROBANK:
Personal Savings Account Name: Lorenzo G. Espina
Bank Account No.: 660-3-66082394-9

BDO:
Personal Savings Account Name: Lorenzo G. Espina
Bank Account No.: 008040163299

CHINA SAVINGS BANK:
Personal Savings Account Name: Lorenzo G. Espina
Bank Account No.: 629502000379

PNB:
Personal Savings Account Name: Lorenzo G. Espina
Bank Account No.: 308610262761

{{PAYMENT_SCHEDULE}}

5. This cost is inclusive of all materials, all labor and all testing and commissioning of the {{SYSTEM_SHORT}} system, and as per inclusions below:

- This includes all materials shown on SL Diagram, and materials not shown on SL Diagram, if required for installation, operability, maintainability, or for compliance to the Philippine Electrical Code, Local Codes or safety reasons.

6. First Party shall provide As-built copies of SL diagrams in .pdf format, to be submitted at commissioning completion.

7. The Solar PV System equipment delivered and installed are covered by a warranty policy from the manufacturers thru the Supplier and First Party:

- Solar PV panels/modules: 12 years product warranty and 25-year linear performance guarantee.
- Hybrid-Ongrid inverter: 5 years warranty.
- LiFePO4 Battery: 5 years warranty.
- Rapid Shutdown Device: 5 years warranty.
- System installation and free service warranty: 3 years.

Trouble-shooting works, if required, shall be done during office hours of working days (Mondays-Saturdays) only, unless otherwise agreed by both Parties.

First Party shall provide free cleaning of solar panels, inverter and battery setup once a year within the warranty period only. Any related works after the warranty period shall have a corresponding maintenance fee.

All equipment warranty claims shall be in accordance to manufacturer's warranty policy.

8. In the event of damages resulting from unforeseen occurrence caused by force majeure, the First Party shall not be liable.

9. First Party shall check and verify the integrity of the steel framing structure before installation of the solar pv modules to make sure it can carry the entire weight of the pv array system.

10. First Party shall start the solar pv system installation two weeks after the signing of this Installation Agreement and shall complete the installation, testing, and commissioning after the next two weeks. Note that when batteries were purchased from Manila, shipment by sea will arrive in Dumaguete City after about 2 weeks.

11. Second Party shall not make any unauthorized system adjustments or modification of the solar pv installation restricted inverter settings without the prior knowledge of the First Party. Any such form of action by the Second Party shall void the warranties of the entire system.

12. The solar PV system shall be placed under close monitoring for 2 months right after the system turnover. Any problem that may arise during this period shall be rectified immediately by the First Party without any additional cost from the Second Party.

13. Any dispute, controversy or claim arising out of or relating to this Agreement, or the breach, termination or invalidity thereof shall be settled by mutually agreed lawyers within Dumaguete City, Negros Oriental.

IN WITNESS WHEREOF, the parties have executed this Solar PV System Installation Agreement, on this {{DATE_LONG}} at {{SIGNING_PLACE}}.

ENSOLAR SOLUTIONS Installation Services



_________________________________
MR. LORENZO G. ESPINA, REE
First Party, Owner



_________________________________
{{CUSTOMER_NAME}}
Second Party, Client$tpl$);
