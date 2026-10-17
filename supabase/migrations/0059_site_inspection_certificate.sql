-- Certificate of Site Inspection and Technical Assessment (CSI-): issued to
-- loan applicants (DCCCO solar PV loan) after the site visit, from the
-- owner's standard wording. The financing institution is a placeholder so
-- other banks can be written in while editing.

insert into public.doc_templates (key, title, body) values
('site_inspection_certificate', 'Certificate of Site Inspection and Technical Assessment', $tpl$CERTIFICATE OF SITE INSPECTION AND TECHNICAL ASSESSMENT

This is to certify that Mr./Ms. {{CUSTOMER_NAME}}, residing at {{CUSTOMER_ADDRESS}}, has requested a site inspection and technical assessment of the property intended for the installation of a Solar Photovoltaic (PV) System.

Based on the site inspection and assessment conducted on ____________________, the property has been found to be technically suitable for a proposed solar PV system installation, subject to the final system design, structural adequacy of the roof or mounting structure, applicable electrical and safety requirements, and other conditions identified during the detailed engineering and installation process.

Therefore, the property is considered eligible for consideration for a Solar PV System installation project, and this Certificate is issued in support of the applicant's intention to apply for a Solar PV Loan from {{BANK_NAME}} to finance the proposed installation.

This Certificate may be submitted to {{BANK_NAME}} as supporting documentation for the applicant's solar PV loan application. It confirms the result of the site inspection and preliminary technical suitability assessment conducted by Ensolar Solutions Installation Services. It does not constitute a guarantee of loan approval, a final engineering certification, or a warranty of the property's structural integrity.

This certification is issued upon the request of the above-named applicant solely for the stated purpose of supporting their Solar PV Loan application with {{BANK_NAME}}.

Issued this {{DATE_LONG}}, at Dumaguete City, Negros Oriental, Philippines.

Inspected By:



_______________________
(Signature over printed Name)
Position: ____________________

Approved By:



_______________________
MR. LORENZO G. ESPINA, REE
General Manager$tpl$)
on conflict (key) do nothing;
