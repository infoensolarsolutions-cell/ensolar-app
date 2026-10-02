-- Owner's contact correction on the Equipment Specifications template:
-- mobile 0927-670-2708 → 0953-561-2557, landline added. Uses replace() so
-- any other edits the owner made to the template are preserved.

update public.doc_templates
set body = replace(
  body,
  'Contact number: 0927-670-2708',
  'Contact number: 0953-561-2557 · Landline: (035) 531-6455'
)
where key = 'equipment_specs';
