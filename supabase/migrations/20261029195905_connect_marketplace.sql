-- Shared catalogue remains separate from seller-provided listing information.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  model_id uuid not null references public.vehicle_models(id),
  title text not null check (length(btrim(title)) between 5 and 120),
  description text not null default '' check (length(description) <= 5000),
  price numeric(12,0) not null check (price between 1 and 999999999),
  year smallint not null check (year between 1886 and 2200),
  mileage integer not null check (mileage between 0 and 9999999),
  city text not null check (length(btrim(city)) between 2 and 60),
  district text not null default '' check (length(district) <= 80),
  fuel text not null check (fuel in ('Benzin','Dizel','LPG','Hibrit','Elektrik','Diğer')),
  transmission text not null check (transmission in ('Otomatik','Manuel')),
  body text not null check (body in ('SUV','Sedan','Hatchback','Station wagon','Coupe','Cabrio','Diğer')),
  paint text not null default 'unknown' check (paint in ('unknown','none','present')),
  replacement text not null default 'unknown' check (replacement in ('unknown','none','present')),
  seller_name text not null check (length(btrim(seller_name)) between 2 and 80),
  contact_phone text not null default '' check (length(contact_phone) <= 30),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_owner_idx on public.listings(owner_id, created_at desc);
create index listings_model_idx on public.listings(model_id);
create index listings_feed_idx on public.listings(created_at desc, id) where status = 'published';
create index listings_price_idx on public.listings(price) where status = 'published';

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  object_path text not null unique,
  position smallint not null check (position between 0 and 7),
  unique(listing_id, position)
);
create table public.listing_favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, listing_id)
);
create index listing_favorites_listing_idx on public.listing_favorites(listing_id);
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'object' and octet_length(criteria::text) < 10000),
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches(user_id, created_at desc);

alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_favorites enable row level security;
alter table public.saved_searches enable row level security;
revoke all on public.listings,public.listing_photos,public.listing_favorites,public.saved_searches from anon,authenticated;
grant select on public.listings,public.listing_photos to anon;
grant select,insert,update,delete on public.listings,public.listing_photos,public.listing_favorites,public.saved_searches to authenticated;
grant all on public.listings,public.listing_photos,public.listing_favorites,public.saved_searches to service_role;

create policy listings_read on public.listings for select to anon,authenticated using (status='published' or owner_id=(select auth.uid()));
create policy listings_insert on public.listings for insert to authenticated with check (owner_id=(select auth.uid()) and status='draft');
create policy listings_update on public.listings for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
-- Users archive listings instead of deleting their history.
create policy photos_read on public.listing_photos for select to anon,authenticated using (exists(select 1 from public.listings l where l.id=listing_id));
create policy photos_insert on public.listing_photos for insert to authenticated with check (
  exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=(select auth.uid()) and l.status='draft'
    and split_part(object_path,'/',1)=l.owner_id::text and split_part(object_path,'/',2)=l.id::text)
  and exists(select 1 from storage.objects o where o.bucket_id='listing-photos' and o.name=object_path)
);
create policy photos_delete on public.listing_photos for delete to authenticated using (
  exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=(select auth.uid()) and l.status<>'published')
);
create policy favorites_read on public.listing_favorites for select to authenticated using (user_id=(select auth.uid()));
create policy favorites_insert on public.listing_favorites for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.listings l where l.id=listing_id and l.status='published'));
create policy favorites_delete on public.listing_favorites for delete to authenticated using (user_id=(select auth.uid()));
create policy searches_read on public.saved_searches for select to authenticated using (user_id=(select auth.uid()));
create policy searches_insert on public.saved_searches for insert to authenticated with check (user_id=(select auth.uid()));
create policy searches_delete on public.saved_searches for delete to authenticated using (user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listing-photos','listing-photos',false,8388608,array['image/jpeg','image/png','image/webp']);
-- Draft objects are owner-only; photos in a published listing folder are readable.
create policy listing_objects_read on storage.objects for select to anon,authenticated using (
  bucket_id='listing-photos' and exists(select 1 from public.listings l where split_part(name,'/',2)=l.id::text
    and split_part(name,'/',1)=l.owner_id::text and (l.owner_id=(select auth.uid()) or l.status='published'))
);
create policy listing_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id='listing-photos' and split_part(name,'/',1)=(select auth.uid())::text
  and exists(select 1 from public.listings l where split_part(name,'/',2)=l.id::text and l.owner_id=(select auth.uid()) and l.status='draft')
);
create policy listing_objects_delete on storage.objects for delete to authenticated using (
  bucket_id='listing-photos' and split_part(name,'/',1)=(select auth.uid())::text
  and exists(select 1 from public.listings l where split_part(name,'/',2)=l.id::text and l.owner_id=(select auth.uid()) and l.status<>'published')
);

create function public.check_listing_publication() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.id is distinct from old.id then
    raise exception 'Listing ownership and identity cannot change';
  end if;
  if new.status='published' and not exists(select 1 from public.listing_photos p join storage.objects o on o.name=p.object_path and o.bucket_id='listing-photos' where p.listing_id=new.id) then
    raise exception 'Yayımlamak için en az bir fotoğraf yükle';
  end if;
  new.created_at:=old.created_at;
  new.updated_at:=now();
  return new;
end; $$;
revoke all on function public.check_listing_publication() from public,anon,authenticated;
create trigger check_listing_publication before update on public.listings for each row execute function public.check_listing_publication();
