-- =====================================================================
-- PortWatch migration 2: Row Level Security
-- Enables RLS on every table, adds is_admin(), and creates all policies.
-- Depends on migration 1.
--
-- Admins are made manually in the SQL editor:
--   update public.profiles set role = 'admin' where id = '<user uuid>';
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- is_admin(): SECURITY DEFINER so it reads profiles without triggering
-- profiles' own RLS (no recursion). search_path is pinned to empty and
-- every reference is schema-qualified.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

-- Only signed-in users need to call it (policies for anon never use it)
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.ports               enable row level security;
alter table public.routes              enable row level security;
alter table public.sources             enable row level security;
alter table public.announcements       enable row level security;
alter table public.announcement_routes enable row level security;
alter table public.trips               enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- Read: own row; admins read all.
-- No INSERT/UPDATE/DELETE policies: the signup trigger creates rows,
-- and roles are changed manually in the database.
-- ---------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select public.is_admin()));

-- Guard: a role change is only allowed with no signed-in API user
-- (SQL editor / service role). This keeps holding even if an UPDATE
-- policy is added later for other profile columns.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null then
    raise exception 'profiles.role can only be changed directly in the database'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prevent_role_change
  before update of role on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------------------------------------------------------------------
-- ports
-- ---------------------------------------------------------------------
create policy ports_select_public on public.ports
  for select to anon, authenticated
  using (true);

create policy ports_insert_admin on public.ports
  for insert to authenticated
  with check ((select public.is_admin()));

create policy ports_update_admin on public.ports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy ports_delete_admin on public.ports
  for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- routes
-- ---------------------------------------------------------------------
create policy routes_select_public on public.routes
  for select to anon, authenticated
  using (true);

create policy routes_insert_admin on public.routes
  for insert to authenticated
  with check ((select public.is_admin()));

create policy routes_update_admin on public.routes
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy routes_delete_admin on public.routes
  for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------
create policy sources_select_public on public.sources
  for select to anon, authenticated
  using (true);

create policy sources_insert_admin on public.sources
  for insert to authenticated
  with check ((select public.is_admin()));

create policy sources_update_admin on public.sources
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy sources_delete_admin on public.sources
  for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- announcements
-- Public: ACTIVE only. Admins: read everything, plus insert/update/delete.
-- ---------------------------------------------------------------------
create policy announcements_select_public_active on public.announcements
  for select to anon, authenticated
  using (status = 'ACTIVE');

create policy announcements_select_admin on public.announcements
  for select to authenticated
  using ((select public.is_admin()));

create policy announcements_insert_admin on public.announcements
  for insert to authenticated
  with check ((select public.is_admin()));

create policy announcements_update_admin on public.announcements
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy announcements_delete_admin on public.announcements
  for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- announcement_routes
-- ---------------------------------------------------------------------
create policy announcement_routes_select_public on public.announcement_routes
  for select to anon, authenticated
  using (true);

create policy announcement_routes_insert_admin on public.announcement_routes
  for insert to authenticated
  with check ((select public.is_admin()));

create policy announcement_routes_update_admin on public.announcement_routes
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy announcement_routes_delete_admin on public.announcement_routes
  for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- trips: signed-in users touch only their own rows (admins get no access)
-- ---------------------------------------------------------------------
create policy trips_select_own on public.trips
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy trips_insert_own on public.trips
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy trips_update_own on public.trips
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy trips_delete_own on public.trips
  for delete to authenticated
  using (user_id = (select auth.uid()));

commit;