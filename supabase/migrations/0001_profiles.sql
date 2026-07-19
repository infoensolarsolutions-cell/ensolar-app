-- Step 2: users/roles foundation.
-- Roles per Spec §3; RBAC is enforced server-side and via RLS.

create type public.user_role as enum ('owner', 'office_staff', 'technician', 'customer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text,
  role public.user_role not null default 'customer',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile when an auth user is created. Role can be preset by
-- an admin-created user via app_metadata.role; defaults to least privilege.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security-definer helper so RLS policies can check the caller's role
-- without recursing into profiles' own policies.
create function public.get_my_role()
returns public.user_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "staff read all profiles"
  on public.profiles for select
  to authenticated
  using (public.get_my_role() in ('owner', 'office_staff'));

-- Users may edit their own name/phone. Role/active changes are blocked for
-- non-owners by the trigger below, not by column grants, to keep policies simple.
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "owner updates any profile"
  on public.profiles for update
  to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create function public.protect_role_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null for service-role/admin connections, which may manage roles.
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and (select auth.uid()) is not null
     and public.get_my_role() is distinct from 'owner' then
    raise exception 'only the owner can change roles or active status';
  end if;
  return new;
end;
$$;

create trigger protect_role_columns
  before update on public.profiles
  for each row execute function public.protect_role_columns();
