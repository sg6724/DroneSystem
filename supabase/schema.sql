-- ============================================================================
-- SkyGrid — Drone Survey Management System
-- Supabase schema (run in SQL Editor or via MCP apply_sql)
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
-- create extension if not exists "postgis"; -- optional spatial additions

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
create table if not exists organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- PROFILES (links auth.users -> organization)
-- ============================================================================
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid not null references organizations (id) on delete cascade,
  full_name   text,
  role        text not null default 'operator' check (role in ('admin', 'operator', 'analyst')),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- DRONES
-- ----------------------------------------------------------------------------
create table if not exists drones (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references organizations (id) on delete cascade,
  name              text not null,
  model             text not null,
  status            text not null default 'available'
                      check (status in ('available', 'in_mission', 'charging', 'maintenance', 'offline')),
  battery           real not null default 100 check (battery between 0 and 100),
  max_range_km      real not null default 10,
  max_speed_mps     real not null default 15,
  max_altitude_m    real not null default 120,
  home_lat          real not null,
  home_lng          real not null,
  last_lat          real not null,
  last_lng          real not null,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- MISSIONS
-- ----------------------------------------------------------------------------
create table if not exists missions (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references organizations (id) on delete cascade,
  name                text not null,
  site_name           text,
  drone_id            uuid references drones (id),
  status              text not null default 'planned'
                        check (status in ('planned', 'starting', 'in_progress', 'paused', 'completed', 'aborted')),
  pattern             text not null check (pattern in ('grid', 'crosshatch', 'perimeter')),
  area_geojson        jsonb,                -- survey area polygon (geojson)
  waypoints           jsonb,                -- [ {lat,lng,alt,speed,index} ... ]
  altitude_m          real not null default 60,
  speed_mps           real not null default 12,
  overlap_percent     real not null default 70 check (overlap_percent between 0 and 95),
  sensor_cadence_s    real not null default 1,   -- capture interval in seconds

  planned_distance_km real,
  planned_duration_s  int,
  area_ha             real,
  estimated_images    int,

  -- execution timeline (deterministic simulation state)
  start_at            timestamptz,
  end_at              timestamptz,
  paused_at           timestamptz,
  total_pause_s       bigint not null default 0,
  aborted_waypoint_ix integer,              -- where aborted
  telemetry_snapshot  jsonb,                -- last computed position

  -- completed stats
  actual_distance_km  real,
  actual_duration_s   int,
  coverage_pct        real check (coverage_pct between 0 and 100),
  images_captured     int,

  created_at          timestamptz not null default now()
);

create index if not exists idx_missions_org on missions (org_id);
create index if not exists idx_missions_status on missions (status);

-- ----------------------------------------------------------------------------
-- MISSION EVENTS (status ledger — source for the live event feed)
-- ----------------------------------------------------------------------------
create table if not exists mission_events (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations (id) on delete cascade,
  mission_id  uuid not null references missions (id) on delete cascade,
  event       text not null check (event in
              ('planned', 'starting', 'in_progress', 'paused', 'resumed',
               'waypoint_reached', 'completed', 'aborted')),
  waypoint_ix integer,
  note        text,
  at          timestamptz not null default now()
);

create index if not exists idx_events_mission on mission_events (mission_id, at);

-- ============================================================================
-- ROW LEVEL SECURITY — org isolation via profiles
-- ============================================================================
alter table organizations     enable row level security;
alter table profiles          enable row level security;
alter table drones            enable row level security;
alter table missions          enable row level security;
alter table mission_events    enable row level security;

drop policy if exists "orgs: select own" on organizations;
create policy "orgs: select own" on organizations
  for select using (id in (select org_id from profiles where id = auth.uid()));

drop policy if exists "profiles: select own" on profiles;
create policy "profiles: select own" on profiles
  for select using (id = auth.uid());

drop policy if exists "profiles: update own" on profiles;
create policy "profiles: update own" on profiles
  for update using (id = auth.uid());

drop policy if exists "drones: all own org" on drones;
create policy "drones: all own org" on drones
  for all using (org_id in (select org_id from profiles where id = auth.uid()));

drop policy if exists "missions: all own org" on missions;
create policy "missions: all own org" on missions
  for all using (org_id in (select org_id from profiles where id = auth.uid()));

drop policy if exists "events: all own org" on mission_events;
create policy "events: all own org" on mission_events
  for all using (org_id in (select org_id from profiles where id = auth.uid()));

-- ============================================================================
-- ON SIGNUP: auto-create the organization + profile
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into organizations (name)
  values (coalesce(new.raw_user_meta_data->>'org_name', 'My Drone Operations'))
  returning id into v_org_id;

  insert into profiles (id, org_id, full_name)
  values (new.id, v_org_id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  -- seed a small starter fleet so new orgs can survey immediately
  insert into drones (org_id, name, model, status, battery, max_range_km, max_speed_mps,
                      max_altitude_m, home_lat, home_lng, last_lat, last_lng) values
    (v_org_id, 'SkyHawk-01', 'DJI Matrice 350 RTK', 'available',   98, 12, 14, 120, 12.9716, 77.5946, 12.9716, 77.5946),
    (v_org_id, 'Condor-07',  'DJI Mavic 3 Enterprise', 'available', 87, 9,  16, 120, 19.0760, 72.8777, 19.0760, 72.8777),
    (v_org_id, 'Vulture-4',  'DJI Matrice 300 RTK',  'charging',    62, 15, 13, 120, 28.6139, 77.2090, 28.6139, 77.2090);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- The function is trigger-only; don't expose it over PostgREST.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
