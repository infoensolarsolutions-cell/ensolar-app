-- Certificate of Completion: issued after installation/T&C, required by
-- financing institutions before releasing solar loan proceeds. Parked in
-- doc_templates beside the contract and compliance certificate; generated
-- copies live in contracts (doc_type 'certificate') numbered COMP-YYYY-####.

insert into public.doc_templates (key, title, body) values
('completion_certificate', 'Certificate of Completion (Solar PV Project)', $tpl$CERTIFICATE OF COMPLETION

{{DATE_LONG}}

To Whom It May Concern:

This is to certify that the {{SYSTEM_DESCRIPTION}} of {{CUSTOMER_NAME}} (Project Owner), located at {{CUSTOMER_ADDRESS}}, has been FULLY COMPLETED, tested, and commissioned by Ensolar Solutions Installation Services on {{COMPLETION_DATE}}, in accordance with the applicable provisions, standards, and safety requirements of the Philippine Electrical Code (PEC) Part 1, 2017 Edition.

The completed installation consists of the following major components:

{{EQUIPMENT_LIST}}

This further certifies that:

- The installation was carried out following standard electrical and solar photovoltaic installation practices.
- Proper wire sizing, overcurrent protection, grounding, disconnecting means, and safety protection devices were provided in accordance with PEC requirements.
- All electrical connections and equipment installations were tested and verified prior to energization.
- The system was energized, commissioned, and turned over to the Project Owner in good and safe operating condition, covered by the warranties stated in the Installation Agreement.

This certification is being issued upon the request of {{CUSTOMER_NAME}}, Project Owner, in support of his/her Solar Loan requirements with {{BANK_NAME}} (Bank / Financing Institution), and for whatever legal purpose it may serve.

Certified by:



_________________________________
ENGR. LORENZO G. ESPINA, REE
Ensolar Solutions Installation Services
PRC No.: 019374$tpl$);
