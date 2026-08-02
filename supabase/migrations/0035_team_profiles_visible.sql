-- Technicians could not see any teammate profiles (only owner/office_staff
-- had a read-all policy), so their Messages contact list was empty and chats
-- never surfaced. Team members may see team profiles; customers stay hidden
-- from technicians and excluded from chat.
create policy "team members read team profiles" on public.profiles
  for select to authenticated
  using (
    public.get_my_role() in ('owner', 'office_staff', 'technician')
    and role in ('owner', 'office_staff', 'technician')
  );
