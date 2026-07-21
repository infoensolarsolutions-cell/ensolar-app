-- Public bucket for landing-page photos, managed by the owner in
-- More > Landing Page Photos (fixed slots: hero.jpg, work1-3.jpg).

insert into storage.buckets (id, name, public)
values ('landing', 'landing', true)
on conflict (id) do nothing;

create policy "public read landing photos"
  on storage.objects for select to public
  using (bucket_id = 'landing');

create policy "owner uploads landing photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'landing' and public.get_my_role() = 'owner');

create policy "owner updates landing photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'landing' and public.get_my_role() = 'owner')
  with check (bucket_id = 'landing' and public.get_my_role() = 'owner');

create policy "owner deletes landing photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'landing' and public.get_my_role() = 'owner');
