-- Technicians handle the two field documents — Electrical Test &
-- Commissioning (ETC-) and Equipment Specifications (SPEC-): they can read
-- those templates and read/create/update those documents, and nothing else
-- (agreements and certificates stay office-only).

create policy "technicians read tech templates" on public.doc_templates
  for select to authenticated
  using (
    public.get_my_role() = 'technician'
    and key in ('commissioning_report', 'equipment_specs')
  );

create policy "technicians read tech docs" on public.contracts
  for select to authenticated
  using (
    public.get_my_role() = 'technician'
    and (contract_no like 'ETC-%' or contract_no like 'SPEC-%')
  );

create policy "technicians create tech docs" on public.contracts
  for insert to authenticated
  with check (
    public.get_my_role() = 'technician'
    and (contract_no like 'ETC-%' or contract_no like 'SPEC-%')
  );

create policy "technicians update tech docs" on public.contracts
  for update to authenticated
  using (
    public.get_my_role() = 'technician'
    and (contract_no like 'ETC-%' or contract_no like 'SPEC-%')
  )
  with check (
    public.get_my_role() = 'technician'
    and (contract_no like 'ETC-%' or contract_no like 'SPEC-%')
  );
