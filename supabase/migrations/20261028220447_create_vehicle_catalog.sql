-- Technical catalogue only. Listing price, mileage, condition and ownership
-- belong to individual listings and must never be inferred from this catalogue.
create table public.vehicle_catalog_sources (
  id text primary key check (length(btrim(id)) > 0),
  name text not null check (length(btrim(name)) > 0),
  url text not null check (url ~ '^https://'),
  license text not null,
  version text not null,
  attribution text not null,
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create table public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null check (length(btrim(name)) > 0),
  source_id text not null references public.vehicle_catalog_sources(id),
  source_key text not null,
  source_version text not null,
  unique (source_id, source_key)
);

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes(id),
  slug text not null check (length(btrim(slug)) > 0),
  name text not null check (length(btrim(name)) > 0),
  body_types text[] not null default '{}',
  aliases text[] not null default '{}',
  -- Presence in another country's register does not prove availability in Turkey.
  observed_countries text[] not null default '{}',
  evidence_sources text[] not null default '{}',
  source_id text not null references public.vehicle_catalog_sources(id),
  source_key text not null,
  source_version text not null,
  unique (make_id, slug),
  unique (source_id, source_key)
);

-- Only insert years supported by year-specific evidence. Production start/end
-- dates or a country's registration date are not a list of valid model years.
create table public.vehicle_model_years (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id),
  year smallint not null check (year between 1886 and 2200),
  market_code text not null check (market_code ~ '^[A-Z]{2}$'),
  source_id text not null references public.vehicle_catalog_sources(id),
  source_key text not null,
  source_version text not null,
  unique (model_id, year, market_code)
);
create index vehicle_model_years_source_idx on public.vehicle_model_years(source_id);

create table public.vehicle_variants (
  id uuid primary key default gen_random_uuid(),
  model_year_id uuid not null references public.vehicle_model_years(id),
  name text not null check (length(btrim(name)) > 0),
  trim_name text,
  engine_name text,
  fuel_type text check (fuel_type in ('petrol', 'diesel', 'lpg', 'hybrid', 'plug_in_hybrid', 'electric', 'hydrogen', 'other')),
  transmission text check (transmission in ('manual', 'automatic', 'automated_manual', 'cvt', 'single_speed', 'other')),
  drivetrain text check (drivetrain in ('fwd', 'rwd', 'awd', '4wd', 'other')),
  body_type text,
  engine_cc integer check (engine_cc > 0),
  power_kw numeric(8,2) check (power_kw > 0),
  torque_nm numeric(8,2) check (torque_nm > 0),
  seats smallint check (seats between 1 and 99),
  doors smallint check (doors between 1 and 9),
  boot_litres integer check (boot_litres >= 0),
  consumption_l_100km numeric(5,2) check (consumption_l_100km > 0),
  consumption_kwh_100km numeric(5,2) check (consumption_kwh_100km > 0),
  -- Keep WLTP/NEDC and measurement provenance with every consumption value.
  consumption_standard text,
  source_id text not null references public.vehicle_catalog_sources(id),
  source_key text not null,
  source_version text not null,
  unique (source_id, source_key),
  check ((consumption_l_100km is null and consumption_kwh_100km is null)
    or nullif(btrim(consumption_standard), '') is not null)
);
create index vehicle_variants_model_year_idx on public.vehicle_variants(model_year_id);

-- Shared, non-personal reference data is publicly readable. Client roles cannot
-- create/change catalogue entries; imports use the trusted database connection.
alter table public.vehicle_catalog_sources enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_model_years enable row level security;
alter table public.vehicle_variants enable row level security;

revoke all on public.vehicle_catalog_sources, public.vehicle_makes,
  public.vehicle_models, public.vehicle_model_years, public.vehicle_variants
  from anon, authenticated;
grant select on public.vehicle_catalog_sources, public.vehicle_makes,
  public.vehicle_models, public.vehicle_model_years, public.vehicle_variants
  to anon, authenticated;
grant all on public.vehicle_catalog_sources, public.vehicle_makes,
  public.vehicle_models, public.vehicle_model_years, public.vehicle_variants
  to service_role;

create policy catalog_sources_read on public.vehicle_catalog_sources for select to anon, authenticated using (true);
create policy catalog_makes_read on public.vehicle_makes for select to anon, authenticated using (true);
create policy catalog_models_read on public.vehicle_models for select to anon, authenticated using (true);
create policy catalog_years_read on public.vehicle_model_years for select to anon, authenticated using (true);
create policy catalog_variants_read on public.vehicle_variants for select to anon, authenticated using (true);
