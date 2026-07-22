-- Team chat: 1-on-1 real-time messages between app users (non-customers).

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id),
  recipient_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint no_self_message check (sender_id <> recipient_id)
);

create index messages_recipient_idx on public.messages (recipient_id, read_at);
create index messages_pair_idx on public.messages (sender_id, recipient_id, created_at);

alter table public.messages enable row level security;

create policy "participants read their messages" on public.messages
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "send as yourself" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.get_my_role() <> 'customer'
  );

create policy "recipient updates read state" on public.messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create function public.protect_message_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.created_at is distinct from old.created_at then
    raise exception 'only the read status can be changed';
  end if;
  return new;
end;
$$;

create trigger protect_message_update
  before update on public.messages
  for each row execute function public.protect_message_update();

alter publication supabase_realtime add table public.messages;
