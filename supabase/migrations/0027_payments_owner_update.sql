-- Payments were append-only (no update policy), which silently blocked the
-- owner's method correction. Allow the owner to update; the app only ever
-- writes the method column and logs the change on the project timeline.
create policy "owner updates payments" on public.payments
  for update to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
