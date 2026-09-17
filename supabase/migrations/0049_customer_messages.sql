-- Customers can message the company (staff profiles only, never other
-- customers); staff could already message anyone. (Applied via MCP.)

create function public.is_staff_profile(p_profile uuid)
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_profile and role in ('owner', 'office_staff')
  );
$$;

drop policy "send as yourself" on public.messages;
create policy "send as yourself" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      public.get_my_role() <> 'customer'
      or public.is_staff_profile(recipient_id)
    )
  );
