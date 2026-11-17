import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const live = process.env.MARKETPLACE_LIVE_QA === '1';
test('live: owner, second user and guest obey listing, photo and private-data rules', { skip: !live }, async () => {
  const qaFile = new URL('../.local/marketplace-qa.json', import.meta.url);
  const qa = JSON.parse(await readFile(qaFile,'utf8'));
  const url = 'https://hsentdihwpkmgvavzyiq.supabase.co';
  const key = 'sb_publishable_y9niOuYRzKOtDHmBgQd8SA_udSLbUsW';
  const client = () => createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const a=client(), b=client(), guest=client();
  for (const [api,user] of [[a,qa.users[0]],[b,qa.users[1]]]) {
    const {error}=await api.auth.signInWithPassword({email:user.email,password:user.password}); assert.ifError(error);
  }
  const model = await guest.from('vehicle_models').select('id').eq('name','Compass').limit(1).single(); assert.ifError(model.error);
  const input={model_id:model.data.id,title:'QA entegrasyon aracı',description:'Otomatik doğrulama kaydı; gerçek satış ilanı değildir.',price:900000,year:2021,mileage:68400,city:'İstanbul',district:'Kadıköy',fuel:'Benzin',transmission:'Otomatik',body:'SUV',paint:'unknown',replacement:'unknown'};
  assert.ok((await guest.from('listings').insert(input)).error,'Guest cannot create a listing');
  const created=await a.from('listings').insert(input).select('id').single(); assert.ifError(created.error);
  const id=created.data.id; qa.apiListingId=id; await writeFile(qaFile,JSON.stringify(qa),{mode:0o600});
  const path=`${qa.users[0].id}/${id}/${randomUUID()}.jpg`;
  const uploadedPaths=[path];
  try {
    assert.deepEqual((await b.from('marketplace_listings').select('id').eq('id',id)).data,[],'Other account cannot read a draft');
    assert.deepEqual((await guest.from('marketplace_listings').select('id').eq('id',id)).data,[],'Guest cannot read a draft');
    assert.deepEqual((await b.from('listings').update({price:1}).eq('id',id).select('id')).data,[],'Other account cannot edit');
    assert.ok((await a.from('listings').update({status:'published'}).eq('id',id)).error,'Photo is required by database');
    assert.ok((await b.from('listings').insert({...input,owner_id:qa.users[0].id})).error,'Cannot impersonate another owner');
    const image=await sharp({create:{width:1200,height:800,channels:3,background:'#d9e0e5'}}).jpeg().toBuffer();
    assert.ok((await b.storage.from('listing-photos').upload(path,image,{contentType:'image/jpeg'})).error,'Other account cannot upload into owner folder');
    assert.ifError((await a.storage.from('listing-photos').upload(path,image,{contentType:'image/jpeg'})).error);
    assert.ok((await guest.storage.from('listing-photos').createSignedUrl(path,60)).error,'Draft image is private');
    const photo=await a.from('listing_photos').insert({listing_id:id,object_path:path,position:0}).select('id').single(); assert.ifError(photo.error);
    for(let position=1;position<8;position++){
      const extra=`${qa.users[0].id}/${id}/${randomUUID()}.jpg`;
      assert.ifError((await a.storage.from('listing-photos').upload(extra,image,{contentType:'image/jpeg'})).error); uploadedPaths.push(extra);
      assert.ifError((await a.from('listing_photos').insert({listing_id:id,object_path:extra,position})).error);
    }
    assert.ifError((await a.from('listings').update({status:'published'}).eq('id',id)).error);
    const published=await guest.from('marketplace_listings').select('*').eq('id',id).single(); assert.ifError(published.error);
    assert.equal(published.data.make_name,'Jeep'); assert.equal(published.data.price,900000);
    for(const field of ['owner_id','seller_name','contact_phone','email']) assert.ok(!(field in published.data),`${field} must not be public`);
    assert.ok((await guest.from('listings').select('owner_id').eq('id',id)).error,'Guest cannot query owner UUID via base table');
    const signed=await guest.storage.from('listing-photos').createSignedUrl(path,60); assert.ifError(signed.error);
    assert.equal((await fetch(signed.data.signedUrl)).status,200,'Published photo can be viewed');
    assert.deepEqual((await guest.from('marketplace_listings').select('id').eq('id',id).lte('price',500000)).data,[],'Budget filter applies at server');
    assert.equal((await guest.from('marketplace_listings').select('id').eq('id',id).ilike('search_text','%Compass%')).data.length,1);
    assert.ifError((await a.from('listing_favorites').insert({listing_id:id})).error);
    assert.deepEqual((await b.from('listing_favorites').select('*')).data,[],'Favorites are private');
    assert.ifError((await a.from('saved_searches').insert({name:'QA araması',criteria:{query:'Jeep',filters:{budget:'1000000'}}})).error);
    assert.deepEqual((await b.from('saved_searches').select('*')).data,[],'Saved searches are private');
    assert.deepEqual((await b.from('listings').update({status:'archived'}).eq('id',id).select('id')).data,[],'Other account cannot withdraw listing');
    assert.ifError((await a.from('listings').update({status:'archived'}).eq('id',id)).error);
    assert.deepEqual((await guest.from('marketplace_listings').select('id').eq('id',id)).data,[],'Withdrawal hides listing');
    assert.ok((await guest.storage.from('listing-photos').createSignedUrl(path,60)).error,'Withdrawal blocks new image URLs');
  } finally {
    await a.from('listings').update({status:'archived'}).eq('id',id);
    const removed=await a.storage.from('listing-photos').remove(uploadedPaths); assert.ifError(removed.error);
    await a.auth.signOut(); await b.auth.signOut();
  }
});
