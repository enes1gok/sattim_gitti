-- These columns have never held user data (empty listings table at rollout).
-- Account/contact information is kept in Auth; it is not part of the public feed.
alter table public.listings drop column seller_name, drop column contact_phone;
revoke select on public.listings from anon;
grant select(id,model_id,title,description,price,year,mileage,city,district,fuel,transmission,body,paint,replacement,status,created_at,updated_at) on public.listings to anon;
drop policy listing_objects_read on storage.objects;
create policy listing_objects_public_read on storage.objects for select to anon using (
  bucket_id='listing-photos' and exists(select 1 from public.listings l where split_part(name,'/',2)=l.id::text and l.status='published')
);
create policy listing_objects_member_read on storage.objects for select to authenticated using (
  bucket_id='listing-photos' and exists(select 1 from public.listings l where split_part(name,'/',2)=l.id::text
    and split_part(name,'/',1)=l.owner_id::text and (l.owner_id=(select auth.uid()) or l.status='published'))
);
create view public.marketplace_listings with (security_invoker=true) as
select l.id,l.model_id,l.title,l.description,l.price,l.year,l.mileage,l.city,l.district,
  l.fuel,l.transmission,l.body,l.paint,l.replacement,l.status,l.created_at,l.updated_at,
  m.name as model_name,mk.name as make_name,
  l.title||' '||m.name||' '||mk.name||' '||l.year::text||' '||l.city||' '||l.fuel||' '||l.transmission||' '||l.body as search_text
from public.listings l join public.vehicle_models m on m.id=l.model_id join public.vehicle_makes mk on mk.id=m.make_id;
grant select on public.marketplace_listings to anon,authenticated,service_role;
