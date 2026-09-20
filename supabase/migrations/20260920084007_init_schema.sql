-- =====================================================================
-- PortWatch migration 1: schema only
-- Enums, tables, constraints, indexes, updated_at triggers,
-- and the auth.users -> profiles trigger.
--
-- RLS is intentionally NOT enabled here. It comes in migration 2.
-- Do not deploy this migration to a shared/production project
-- without applying migration 2 right after it.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.profile_role as enum ('user', 'admin');

create type public.announcement_type as enum (
  'Cancellation',
  'Suspension',
  'Schedule Change',
  'Weather Advisory',
  'Port Advisory',
  'Safety Advisory',
  'General Information'
);

-- Lifecycle of an announcement record ("expired" is computed, never stored)
create type public.announcement_status as enum ('ACTIVE', 'RESOLVED', 'WITHDRAWN');

-- Travel impact this announcement implies (feeds derived route/trip status)
create type public.announcement_impact as enum ('NONE', 'MONITOR', 'DISRUPTED');

-- ---------------------------------------------------------------------
-- Shared trigger function: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ports
-- ---------------------------------------------------------------------
create table public.ports (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint ports_name_not_blank check (btrim(name) <> '')
);

-- No duplicate port with the same name at the same location
create unique index ports_name_location_key
  on public.ports (lower(name), coalesce(lower(location), ''));

-- ---------------------------------------------------------------------
-- routes (directional: A -> B and B -> A are separate rows)
-- ---------------------------------------------------------------------
create table public.routes (
  id                  uuid primary key default gen_random_uuid(),
  origin_port_id      uuid not null references public.ports (id) on delete restrict,
  destination_port_id uuid not null references public.ports (id) on delete restrict,
  name                text not null,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint routes_name_not_blank check (btrim(name) <> ''),
  constraint routes_ports_differ check (origin_port_id <> destination_port_id),
  constraint routes_origin_destination_key unique (origin_port_id, destination_port_id)
);

-- ---------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------
create table public.sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  source_type     text not null,
  url             text not null,
  official        boolean not null default false,
  active          boolean not null default true,  -- false = archived
  last_checked_at timestamptz,                    -- "checked, nothing new" marker
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint sources_name_not_blank check (btrim(name) <> ''),
  constraint sources_type_not_blank check (btrim(source_type) <> ''),
  constraint sources_url_http check (url ~* '^https?://\S+$')
);

create unique index sources_url_key on public.sources (lower(url));

-- ---------------------------------------------------------------------
-- announcements
-- Route links live in announcement_routes, or applies_to_all_routes = true.
-- ---------------------------------------------------------------------
create table public.announcements (
  id                          uuid primary key default gen_random_uuid(),
  source_id                   uuid not null references public.sources (id) on delete restrict,
  title                       text not null,
  description                 text,
  type                        public.announcement_type not null,
  status                      public.announcement_status not null default 'ACTIVE',
  impact                      public.announcement_impact not null default 'NONE',
  published_at                timestamptz not null,
  effective_from              timestamptz,
  effective_until             timestamptz,
  source_url                  text not null,
  applies_to_all_routes       boolean not null default false,
  resolved_at                 timestamptz,
  resolved_by_announcement_id uuid references public.announcements (id) on delete restrict,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint announcements_title_not_blank check (btrim(title) <> ''),
  constraint announcements_source_url_http check (source_url ~* '^https?://\S+$'),
  constraint announcements_effective_range_valid check (
    effective_from is null
    or effective_until is null
    or effective_until >= effective_from
  ),
  -- RESOLVED requires resolved_at; ACTIVE must not have it; WITHDRAWN may keep history
  constraint announcements_resolution_consistent check (
    (status = 'RESOLVED'  and resolved_at is not null)
    or (status = 'ACTIVE' and resolved_at is null)
    or status = 'WITHDRAWN'
  ),
  constraint announcements_resolved_by_needs_resolved_at check (
    resolved_by_announcement_id is null or resolved_at is not null
  ),
  constraint announcements_not_self_resolved check (
    resolved_by_announcement_id is null or resolved_by_announcement_id <> id
  )
);

-- ---------------------------------------------------------------------
-- announcement_routes (join table; pure link rows, so no updated_at)
-- ---------------------------------------------------------------------
create table public.announcement_routes (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  route_id        uuid not null references public.routes (id) on delete restrict,
  created_at      timestamptz not null default now(),
  primary key (announcement_id, route_id)
);

-- ---------------------------------------------------------------------
-- trips (status is derived, so there is deliberately no status column)
-- ---------------------------------------------------------------------
create table public.trips (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  route_id          uuid not null references public.routes (id) on delete restrict,
  travel_date       date not null,
  planned_departure time,  -- local Asia/Manila wall-clock time
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint trips_notes_length check (notes is null or char_length(notes) <= 1000)
);

-- ---------------------------------------------------------------------
-- Indexes
-- (routes_origin_destination_key already covers origin_port_id lookups)
-- ---------------------------------------------------------------------
create index routes_destination_port_id_idx
  on public.routes (destination_port_id);

create index announcements_published_at_idx
  on public.announcements (published_at desc);

create index announcements_source_id_published_at_idx
  on public.announcements (source_id, published_at desc);

create index announcements_active_effective_idx
  on public.announcements (effective_from, effective_until)
  where status = 'ACTIVE';

create index announcements_resolved_by_idx
  on public.announcements (resolved_by_announcement_id)
  where resolved_by_announcement_id is not null;

create index announcement_routes_route_id_idx
  on public.announcement_routes (route_id, announcement_id);

create index trips_user_id_travel_date_idx
  on public.trips (user_id, travel_date desc);

create index trips_route_id_travel_date_idx
  on public.trips (route_id, travel_date);

-- ---------------------------------------------------------------------
-- updated_at triggers (every table that has updated_at)
-- ---------------------------------------------------------------------
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.ports
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.routes
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.sources
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Auto-create a profile (role 'user') when a new auth user signs up
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any auth users that already exist (e.g. dev test accounts)
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

commit;