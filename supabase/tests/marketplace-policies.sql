-- Transaction-only policy fixtures: no test listing or object is committed.
begin;
select set_config('qa.owner',gen_random_uuid()::text,true),set_config('qa.other',gen_random_uuid()::text,true),set_config('qa.listing',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('qa.owner')::uuid),(current_setting('qa.other')::uuid);
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.owner'),'role','authenticated')::text,true);
insert into public.listings(id,model_id,title,price,year,mileage,city,fuel,transmission,body)
select current_setting('qa.listing')::uuid,id,'QA transaction only',900000,2021,68000,'İstanbul','Benzin','Otomatik','SUV'
from public.vehicle_models where name='Compass' limit 1;
do $$ begin
  assert (select count(*)=1 from public.listings where id=current_setting('qa.listing')::uuid),'Owner sees draft';
  begin
    update public.listings set status='published' where id=current_setting('qa.listing')::uuid;
    raise exception 'Photo requirement bypassed';
  exception when raise_exception then
    if sqlerrm='Photo requirement bypassed' then raise; end if;
  end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  assert not exists(select 1 from public.marketplace_listings where id=current_setting('qa.listing')::uuid),'Guest must not see draft';
  begin
    perform owner_id from public.listings;
    raise exception 'Guest can query owner IDs';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.other'),'role','authenticated')::text,true);
do $$ declare n integer; begin
  assert not exists(select 1 from public.marketplace_listings where id=current_setting('qa.listing')::uuid),'Second account must not see draft';
  update public.listings set price=1 where id=current_setting('qa.listing')::uuid;
  get diagnostics n=row_count;
  assert n=0,'Second account cannot edit';
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.owner'),'role','authenticated')::text,true);
-- A Storage metadata fixture is sufficient to exercise SQL policies. It is NOT
-- an upload test; no file is served and the fixture is rolled back below.
insert into storage.objects(bucket_id,name)
select 'listing-photos',current_setting('qa.owner')||'/'||current_setting('qa.listing')||'/policy-test-'||n||'.jpg' from generate_series(0,7) n;
insert into public.listing_photos(listing_id,object_path,position)
select current_setting('qa.listing')::uuid,current_setting('qa.owner')||'/'||current_setting('qa.listing')||'/policy-test-'||n||'.jpg',n from generate_series(0,7) n;
update public.listings set status='published' where id=current_setting('qa.listing')::uuid;
insert into public.listing_favorites(listing_id) values(current_setting('qa.listing')::uuid);
insert into public.saved_searches(name,criteria) values('Policy fixture','{"query":"Jeep","filters":{}}');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.other'),'role','authenticated')::text,true);
do $$ declare n integer; begin
  assert exists(select 1 from public.marketplace_listings where id=current_setting('qa.listing')::uuid),'Second user can see published listing';
  assert not exists(select 1 from public.listing_favorites),'Favorites must remain private';
  assert not exists(select 1 from public.saved_searches),'Searches must remain private';
  update public.listings set status='archived' where id=current_setting('qa.listing')::uuid;
  get diagnostics n=row_count; assert n=0,'Second user cannot archive';
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  assert exists(select 1 from public.marketplace_listings where id=current_setting('qa.listing')::uuid),'Guest can see published listing';
  assert exists(select 1 from public.listing_photos where listing_id=current_setting('qa.listing')::uuid),'Published photos are readable';
  assert exists(select 1 from storage.objects where bucket_id='listing-photos' and split_part(name,'/',2)=current_setting('qa.listing')),'Published image policy';
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('qa.owner'),'role','authenticated')::text,true);
update public.listings set status='archived' where id=current_setting('qa.listing')::uuid;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  assert not exists(select 1 from public.marketplace_listings where id=current_setting('qa.listing')::uuid),'Archived listing is hidden';
  assert not exists(select 1 from storage.objects where bucket_id='listing-photos' and split_part(name,'/',2)=current_setting('qa.listing')),'Archived image is hidden';
end $$;
rollback;
select 'marketplace policy checks passed' as result;
