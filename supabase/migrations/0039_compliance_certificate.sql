-- Certificate of Compliance generator: template parked beside the contract
-- template, generated documents stored in the same contracts table tagged
-- with doc_type ('contract' = Installation Agreement, 'certificate' = COC).

alter table public.contracts
  add column doc_type text not null default 'contract'
  check (doc_type in ('contract', 'certificate'));

insert into public.doc_templates (key, title, body) values
('compliance_certificate', 'Certificate of Compliance (Solar Loan)', $tpl$CERTIFICATION OF COMPLIANCE

{{DATE_LONG}}

To Whom It May Concern:

This is to certify that the proposed {{SYSTEM_DESCRIPTION}} of {{CUSTOMER_NAME}} (Project Owner), located at {{CUSTOMER_ADDRESS}}, to be installed by Ensolar Solutions Installation Services, has been designed and shall be installed, tested, and commissioned in accordance with the applicable provisions, standards, and safety requirements of the Philippine Electrical Code (PEC) Part 1, 2017 Edition.

The system consists of the following major components:

{{EQUIPMENT_LIST}}

This further certifies that:

- The installation shall be carried out following standard electrical and solar photovoltaic installation practices.
- Proper wire sizing, overcurrent protection, grounding, disconnecting means, and safety protection devices shall be provided in accordance with PEC requirements.
- All electrical connections and equipment installations shall be tested and verified prior to energization.
- The system shall be installed with due consideration to operational safety, reliability, and workmanship quality.

This certification is being issued upon the request of {{CUSTOMER_NAME}}, Project Owner, in support of his/her Solar Loan application with {{BANK_NAME}} (Bank / Financing Institution), and for whatever legal purpose it may serve.

Certified by:



_________________________________
ENGR. LORENZO G. ESPINA, REE
Ensolar Solutions Installation Services
PRC No.: 019374$tpl$);
