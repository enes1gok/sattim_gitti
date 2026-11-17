-- Match the eight required photograph regions in the listing form.
create or replace function public.check_listing_publication() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.id is distinct from old.id then
    raise exception 'Listing ownership and identity cannot change';
  end if;
  if new.status='published' and (select count(*) from public.listing_photos p join storage.objects o on o.name=p.object_path and o.bucket_id='listing-photos' where p.listing_id=new.id) <> 8 then
    raise exception 'Yayımlamak için sekiz bölgenin fotoğrafını yükle';
  end if;
  new.created_at:=old.created_at;
  new.updated_at:=now();
  return new;
end; $$;
revoke all on function public.check_listing_publication() from public,anon,authenticated;
