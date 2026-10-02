-- Two technical document templates, generated per project like the
-- contract/certificates: Electrical Test & Commissioning Data (ETC-) and
-- Solar Equipment Technical Specifications (SPEC-). Placeholders are
-- filled from the project, system specs and the Equipment Registry.

insert into public.doc_templates (key, title, body) values
('commissioning_report', 'Electrical Test and Commissioning Data', $tpl$ELECTRICAL TEST AND COMMISSIONING DATA

Project No.: {{PROJECT_NO}}
System Owner: {{CUSTOMER_NAME}}
Installation Site: {{SITE_ADDRESS}}
System: {{SYSTEM_DESCRIPTION}}
Date of Testing: {{DATE_LONG}}

A. PV MODULES
Manufacturer / Type: {{PANEL_BRAND}} {{PANEL_TYPE}}, {{PANEL_W}} W
Number of modules: {{PANEL_QTY}}
Visual inspection (no cracks, defects, delamination): [  ] PASS   [  ] FAIL
Mounting rails/bolts torqued, clamps secured: [  ] PASS   [  ] FAIL
Array frame grounding continuity: [  ] PASS   [  ] FAIL

B. DC STRING MEASUREMENTS (array disconnected from inverter)
String 1 — Voc: ________ V · Polarity: [  ] OK · Isc: ________ A
String 2 — Voc: ________ V · Polarity: [  ] OK · Isc: ________ A
String 3 — Voc: ________ V · Polarity: [  ] OK · Isc: ________ A
String 4 — Voc: ________ V · Polarity: [  ] OK · Isc: ________ A
Insulation resistance PV(+) to ground: ________ MΩ
Insulation resistance PV(−) to ground: ________ MΩ
DC disconnect / SPD / fuses installed and correctly rated: [  ] PASS   [  ] FAIL

C. AC MEASUREMENTS
Grid voltage (L–N): ________ V
Grid frequency: ________ Hz
AC breaker rating: ________ A
Grounding electrode resistance: ________ Ω
AC SPD installed: [  ] PASS   [  ] FAIL

D. INVERTER
Manufacturer / Model: {{INVERTER_BRAND}} {{INVERTER_MODEL}}
Serial Number(s): {{INVERTER_SERIALS}}
Grid settings / country code configured: [  ] PASS   [  ] FAIL
Start-up sequence normal, no fault codes: [  ] PASS   [  ] FAIL
Monitoring (WiFi / app) online: [  ] PASS   [  ] FAIL

E. BATTERY (if applicable)
Brand / Type: {{BATTERY_BRAND}} {{BATTERY_TYPE}}, {{BATTERY_SPEC}} × {{BATTERY_QTY}}
Serial Number(s): {{BATTERY_SERIALS}}
Battery voltage at start-up: ________ V · SOC: ________ %
BMS communication to inverter: [  ] PASS   [  ] FAIL
Charge test: [  ] PASS   [  ] FAIL
Backup / transfer test (grid-loss simulation): [  ] PASS   [  ] FAIL

F. SYSTEM OPERATION
Output power at time of test: ________ W · Weather / irradiance: ______________
Load test (house load on solar/battery): [  ] PASS   [  ] FAIL
Anti-islanding / grid reconnection: [  ] PASS   [  ] FAIL

G. REMARKS
________________________________________________________________

Tested and commissioned by:



_________________________________
ENGR. LORENZO G. ESPINA
Registered Electrical Engineer
ENSOLAR SOLUTIONS Installation Services

Witnessed / conforme (System Owner):



_________________________________
{{CUSTOMER_NAME}}
System Owner$tpl$),
('equipment_specs', 'Solar Equipment Technical Specifications', $tpl$SOLAR EQUIPMENT TECHNICAL SPECIFICATIONS
RE FACILITY TECHNICAL INFORMATION

Project No.: {{PROJECT_NO}}
System Owner: {{CUSTOMER_NAME}}
Installation Site: {{SITE_ADDRESS}}
System: {{SYSTEM_DESCRIPTION}}

A. INVERTER DATA

Manufacturer: {{INVERTER_BRAND}}
Model Number: {{INVERTER_MODEL}}
Serial Number(s): {{INVERTER_SERIALS}}
Inverter Type: Hybrid-Ongrid
Rated Output Power (W): {{INVERTER_W}}
Rated Output Voltage (Vac): 230 V
Rated Output Current (A): ________
Rated Efficiency (%): ________
Frequency (Hz): 60 Hz
Single or Three Phase: Single Phase
Power Factor: 0.8 lagging

B. PHOTOVOLTAIC (PV) PANEL DATA

Manufacturer: {{PANEL_BRAND}}
Model Number: ________
Type of Panel: {{PANEL_TYPE}}
Rated Power per Panel (W): {{PANEL_W}}
Number of Panels: {{PANEL_QTY}}
Rated Output Voltage (Vmpp): ________ Vdc
Rated Open Circuit Voltage (Voc): ________ Vdc
Rated Short Circuit Current (Isc): ________ A
Rated Efficiency (%): ________

C. BATTERY DATA (if applicable)

Manufacturer: {{BATTERY_BRAND}}
Battery Type: {{BATTERY_TYPE}}
Capacity / Voltage: {{BATTERY_SPEC}}
Number of Battery Units: {{BATTERY_QTY}}
Serial Number(s): {{BATTERY_SERIALS}}

D. INSTALLATION DETAILS

Installation cost: Php {{CONTRACT_AMOUNT}}
Date installed: {{INSTALL_DATE}}
Electrical Engr. / Electrician: Engr. Lorenzo G. Espina
Contact number: 0927-670-2708
Company: Ensolar Solutions Installation Services
Company email address: info.ensolarsolutions@gmail.com

SIGNED:



_________________________________
ENGR. LORENZO G. ESPINA
REG. ELECTRICAL ENGINEER
ENSOLAR SOLUTIONS$tpl$)
on conflict (key) do nothing;
