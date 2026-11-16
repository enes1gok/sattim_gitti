-- Run against a freshly seeded database. All checks are read-only.
do $test$
declare
  relation text;
  role_name text;
  privilege_name text;
begin
  assert (select count(*) = 315 from public.vehicle_makes where source_id = 'vehiclesdb'), 'Expected 315 VehiclesDB makes';
  assert (select count(*) = 5541 from public.vehicle_models where source_id = 'vehiclesdb'), 'Expected 5541 VehiclesDB models';
  assert not exists (
    select 1 from public.vehicle_models m left join public.vehicle_makes mk on mk.id = m.make_id where mk.id is null
  ), 'Orphaned model';
  assert exists (
    select 1 from public.vehicle_models m join public.vehicle_makes mk on mk.id = m.make_id
    where mk.slug = 'jeep' and m.slug = 'compass'
  ), 'Jeep Compass missing';
  assert exists (
    select 1 from public.vehicle_models m join public.vehicle_makes mk on mk.id = m.make_id
    where mk.slug = 'tofas' and m.name = 'Şahin'
  ), 'Turkish supplement missing';

  foreach relation in array array['vehicle_catalog_sources','vehicle_makes','vehicle_models','vehicle_model_years','vehicle_variants'] loop
    assert (select relrowsecurity from pg_class where oid = ('public.' || relation)::regclass), 'RLS missing: ' || relation;
    foreach role_name in array array['anon', 'authenticated'] loop
      assert has_table_privilege(role_name, 'public.' || relation, 'SELECT'), 'Read access missing';
      foreach privilege_name in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'] loop
        assert not has_table_privilege(role_name, 'public.' || relation, privilege_name), 'Unexpected client privilege: ' || relation;
      end loop;
    end loop;
  end loop;
end;
$test$;

-- Check actual policy visibility using the application's unauthenticated role.
begin;
set local role anon;
do $test$
begin
  assert (select count(*) >= 5541 from public.vehicle_models), 'Anon catalogue visibility failed';
end;
$test$;
rollback;

select 'catalog checks passed' as result,
  (select count(*) from public.vehicle_makes) as makes,
  (select count(*) from public.vehicle_models) as models,
  (select count(*) from public.vehicle_model_years) as model_years,
  (select count(*) from public.vehicle_variants) as variants;
