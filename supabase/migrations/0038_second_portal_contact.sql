-- Second portal contact per customer: an additional email and login slot so
-- a spouse/partner can also view the project. The access helper recognizes
-- either linked login; every customer-facing policy flows through it.
alter table public.customers
  add column email2 text,
  add column profile_id2 uuid references public.profiles (id);

create or replace function public.is_my_customer_project(p_project_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.customers c on c.id = p.customer_id
    where p.id = p_project_id
      and (
        c.profile_id = (select auth.uid())
        or c.profile_id2 = (select auth.uid())
      )
  );
$$;
