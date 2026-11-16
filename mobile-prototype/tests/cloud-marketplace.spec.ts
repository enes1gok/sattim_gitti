import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// These are UI contract tests with simulated HTTP responses. Database policies
// are verified separately against the real project by marketplace-policies.sql.
test.use({channel:'chrome'});
test.setTimeout(45000);
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
function simulatedServer() {
  const makeId=randomUUID(), modelId=randomUUID(), ownerId=randomUUID();
  const rows: any[]=[]; const photos: any[]=[];
  return async(page: Page) => {
    let loggedIn=false;
    await page.route('https://hsentdihwpkmgvavzyiq.supabase.co/**',async route=>{
      const request=route.request(), url=new URL(request.url()), path=url.pathname, method=request.method();
      let body:any=null; try {body=request.postDataJSON();} catch {}
      const json=(value:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
      const result=(data:any[])=>json(request.headers().accept?.includes('vnd.pgrst.object+json')?data[0]:data);
      if(path.endsWith('/auth/v1/token')){
        loggedIn=true;
        const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
        const token=`${encode({alg:'HS256'})}.${encode({sub:ownerId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test`;
        return json({access_token:token,refresh_token:'test',token_type:'bearer',expires_in:3600,user:{id:ownerId,email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}});
      }
      if(path.endsWith('/auth/v1/user'))return json({id:ownerId,email:'qa@example.invalid',aud:'authenticated',role:'authenticated'});
      if(path.endsWith('/auth/v1/logout')){loggedIn=false;return route.fulfill({status:204});}
      if(path.endsWith('/vehicle_makes'))return json([{id:makeId,name:'Jeep'}, ...['Fiat','Ford','Land Rover','Tofaş','Audi-Porsche','Chevrolet GMC','Citroen-DS','Iveco-Concorde','Fiat-Chausson','Ford-Hymer'].map(name=>({id:randomUUID(),name}))]);
      if(path.endsWith('/vehicle_models'))return result([{id:modelId,name:'Compass',make_id:makeId,body_types:['suv']},{id:randomUUID(),name:'Wrangler',make_id:makeId}]);
      if(path.endsWith('/listings')){
        if(method==='POST'){const row={id:randomUUID(),...body,status:'draft',created_at:new Date().toISOString()};rows.push(row);return result([row]);}
        const selected=loggedIn?rows.filter(row=>!url.searchParams.has('id')||url.searchParams.get('id')===`eq.${row.id}`):[];
        if(method==='PATCH'){selected.forEach(row=>Object.assign(row,body));return result(selected);}
        return result(selected.map(row=>({id:row.id})));
      }
      if(path.endsWith('/marketplace_listings')){
        let data=rows.filter(row=>row.status==='published'||loggedIn);
        const id=url.searchParams.get('id');if(id?.startsWith('eq.'))data=data.filter(row=>id===`eq.${row.id}`);
        const status=url.searchParams.get('status');if(status)data=data.filter(row=>status===`eq.${row.status}`);
        return result(data.map(row=>({...row,make_name:'Jeep',model_name:'Compass'})));
      }
      if(path.endsWith('/listing_photos')){
        if(method==='POST'){const photo={id:randomUUID(),...body};photos.push(photo);return result([photo]);}
        return result(photos);
      }
      if(path.endsWith('/listing_favorites')||path.endsWith('/saved_searches'))return json([]);
      if(path.includes('/storage/v1/object/sign/listing-photos')&&method==='POST')return json(body.paths.map((path:string)=>({path,signedURL:`/object/sign/listing-photos/${path}?token=test`,error:null})));
      if(path.includes('/storage/v1/object/sign/')&&method==='GET')return route.fulfill({status:200,contentType:'image/png',body:image});
      if(path.includes('/storage/v1/object/listing-photos/'))return json({Key:path,Id:randomUUID()});
      return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:`Unexpected ${method} ${path}`})});
    });
  };
}

for(const platform of ['iPhone','Android'] as const){
  test(`saved vehicles and searches share one destination (${platform})`, async ({page}) => {
    await simulatedServer()(page);
    await page.goto('/');
    if(platform==='Android'){await page.getByRole('button',{name:/Preview device/}).click();await page.getByRole('menuitemradio',{name:'Pixel 10',exact:true}).click();}
    const nav = page.getByRole('navigation', {name:'Ana gezinme'});
    await expect(nav.getByRole('button')).toHaveCount(3);
    await nav.getByRole('button',{name:'Kaydedilenler'}).click();
    await expect(page.getByRole('button',{name:'Araçlar',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByText('Kaydettiklerin hep yanında.')).toBeVisible();
    await page.getByRole('button',{name:'Giriş yap / hesap oluştur',exact:true}).click();
    await page.getByRole('textbox',{name:'E-posta',exact:true}).fill('qa@example.invalid');
    await page.getByLabel('Şifre',{exact:true}).fill('Test-password-123');
    await page.getByRole('button',{name:'Giriş yap',exact:true}).click();
    await expect(page.getByText('Beğendiğin araçları kaydet.')).toBeVisible();
    await page.getByRole('button',{name:'Aramalar',exact:true}).click();
    await expect(page.getByText('Aramanı bir kez kaydet.')).toBeVisible();
    await expect(page.getByText(/otomatik tarama, fiyat alarmı ve bildirim/)).toBeVisible();
    await page.getByRole('button',{name:'Araçlar',exact:true}).click();
    await expect(page.getByText('Beğendiğin araçları kaydet.')).toBeVisible();
  });
  test(`account deletion request is accessible without signing in (${platform})`,async({page})=>{
    await simulatedServer()(page);
    await page.goto('/');
    if(platform==='Android'){await page.getByRole('button',{name:/Preview device/}).click();await page.getByRole('menuitemradio',{name:'Pixel 10',exact:true}).click();}
    await expect(page.getByRole('navigation', { name: 'Ana gezinme' }).getByRole('button', { name: 'Keşfet' })).toBeVisible();
    await page.getByRole('button', { name: 'Filtreler', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sonuçları göster' })).toBeVisible();
    await page.getByRole('button', { name: "1 milyon ₺'ye kadar" }).click();
    await page.getByRole('button', { name: 'Sonuçları göster' }).click();
    await expect(page.getByRole('button', { name: /Bütçe: 1 milyon.*filtresini kaldır/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aramayı ve filtreleri temizle' })).toBeVisible();
    await page.getByRole('button', { name: 'Aramayı ve filtreleri temizle' }).click();
    await expect(page.getByRole('button', { name: /Bütçe: 1 milyon.*filtresini kaldır/ })).toHaveCount(0);
    await page.locator('form.market-search').getByRole('button', { name: 'Araç ara' }).click();
    await page.getByRole('button',{name:'Hesabım',exact:true}).click();
    const request=page.getByRole('link',{name:/Hesabımı ve verilerimi sil/});
    await expect(request).toBeVisible();
    await expect(request).toHaveAttribute('href',/^mailto:enes\.gok@metu\.edu\.tr\?/);
    const policy=page.getByRole('link',{name:/Gizlilik politikası/});
    await expect(policy).toBeVisible();
    await expect(policy).toHaveAttribute('href',/^https:\/\/freckle-monitor-98d\.notion\.site\//);
  });
  test(`publish and inspect a listing, with required-photo validation (${platform})`,async({browser})=>{
    const context=await browser.newContext({viewport:{width:1100,height:1100}});
    const guestContext=await browser.newContext({viewport:{width:1100,height:1100}});
    const page=await context.newPage();const guest=await guestContext.newPage();const server=simulatedServer();await server(page);await server(guest);
    await page.goto('/');await guest.goto('/');
    if(platform==='Android')for(const p of [page,guest]){await p.getByRole('button',{name:/Preview device/}).click();await p.getByRole('menuitemradio',{name:'Pixel 10',exact:true}).click();}
    await page.getByRole('button',{name:'Araç sat',exact:true}).click();
    await page.getByRole('button',{name:'Marka seç',exact:true}).click();
    await expect(page.getByRole('region',{name:'Marka seçimi'})).toBeVisible();
    await page.getByRole('button',{name:'Araç bilgilerine dön'}).click();
    await page.getByRole('button',{name:'Marka seç',exact:true}).click();
    await expect(page.getByRole('button',{name:'Fiat',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Ford',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Land Rover',exact:true})).toBeVisible();
    const tofasLogo = page.getByRole('button',{name:'Tofaş',exact:true}).locator('img');
    await expect(tofasLogo).toHaveAttribute('src', /brand-logos\/tofas\.svg/);
    await expect.poll(() => tofasLogo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    for (const name of ['Audi-Porsche','Chevrolet GMC','Citroen-DS','Iveco-Concorde']) await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Fiat-Chausson',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Ford-Hymer',exact:true})).toHaveCount(0);
    await page.getByRole('textbox',{name:'Marka ara'}).fill('jee');
    await expect(page.getByRole('button',{name:'Jeep',exact:true}).locator('img')).toHaveAttribute('src', /brand-logos\/jeep-logo\./);
    await expect.poll(() => page.getByRole('button',{name:'Jeep',exact:true}).locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button',{name:'Jeep',exact:true}).click();
    await page.getByRole('button',{name:'Model seç',exact:true}).click();
    await expect(page.getByRole('button',{name:'Wrangler',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Tüm modelleri göster'}).click();
    await expect(page.getByRole('button',{name:'Wrangler',exact:true})).toBeVisible();
    await page.getByRole('textbox',{name:'Model ara'}).fill('comp');
    await expect(page.getByText(/Türkiye listesi güncel sıfır araç verisine dayanır/)).toBeVisible();
    await page.getByRole('button',{name:'Compass',exact:true}).click();
    await expect(page.getByRole('region',{name:'Model seçimi'})).toHaveCount(0);
    await expect(page.getByLabel('Model yılı')).toHaveValue('');
    await page.getByLabel('Model yılı').selectOption('2020');
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await expect(page.getByText(/Katalogda görülen kasa tipleri: SUV/)).toBeVisible();
    await expect(page.getByLabel('Yakıt')).toHaveValue('');
    await expect(page.getByLabel('Vites')).toHaveValue('');
    await page.getByLabel('Kasa tipi').selectOption('SUV');
    await page.getByRole('textbox',{name:'Kilometre',exact:true}).fill('68400');
    await page.getByLabel('Yakıt').selectOption('Benzin');
    await page.getByLabel('Vites').selectOption('Otomatik');
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await expect(page.getByLabel('İlan başlığı')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('İl adını gir.')).toBeVisible();
    await page.getByRole('textbox',{name:'İlan başlığı',exact:true}).fill('QA araç ilanı');
    await page.getByRole('textbox',{name:'Fiyat (₺)',exact:true}).fill('900000');
    await page.getByRole('textbox',{name:'İl',exact:true}).fill('İstanbul');
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await expect(page.getByText(/8 bölgenin fotoğrafını tamamla/)).toBeVisible();
    await page.getByRole('button',{name:'Taslağı kaydet',exact:true}).click();
    await page.getByRole('textbox',{name:'E-posta',exact:true}).fill('qa@example.invalid');
    await page.getByLabel('Şifre',{exact:true}).fill('Test-password-123');
    await page.getByRole('button',{name:'Giriş yap',exact:true}).click();
    await expect(page.getByText('Son bir kontrol.')).toBeVisible();
    await expect(page.getByText('QA araç ilanı',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'İlanı yayımla',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Fotoğrafları tamamla',exact:true}).click();
    await expect(page.getByText('Taslağını eksik fotoğraflarla kaydedebilirsin. Yayımlamak için 8 bölgenin tamamı gerekir.')).toBeVisible();
    await page.evaluate(() => { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('denied')) } }); });
    await page.getByRole('button',{name:'Fotoğraf çek',exact:true}).click();
    await expect(page.getByRole('region',{name:'Ön fotoğrafını çek'})).toBeVisible();
    await expect(page.getByRole('region',{name:'Ön fotoğrafını çek'}).getByRole('alert')).toContainText('Kameraya erişilemedi');
    await expect(page.getByRole('button',{name:'Cihaz kamerasını aç'})).toBeVisible();
    await page.getByRole('button',{name:'Kamerayı kapat'}).click();
    for(let i=0;i<8;i++) {
      await page.getByLabel('Bölge için galeriden fotoğraf seç',{exact:true}).setInputFiles({name:`qa-${i}.png`,mimeType:'image/png',buffer:image});
      await expect(page.getByText('Seçildi, henüz kaydedilmedi. Taslağı kaydettiğinde yüklenir.')).toBeVisible();
      if (i < 7) await page.getByRole('button',{name:/Sonraki eksik bölgeye geç/}).click();
    }
    await expect(page.getByText('8 / 8 hazır')).toBeVisible();
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await page.getByRole('button',{name:'İlanı yayımla',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('İlanın yayımlandı. Diğer kullanıcılar artık görebilir.',{exact:true})).toBeVisible();
    await guest.getByRole('button',{name:'Yenile',exact:true}).click();
    const card = guest.locator('.cloud-listing').filter({ hasText: 'QA araç ilanı' });
    await expect(card.locator('.cloud-card-mileage')).toHaveText('68.400 km');
    await expect(card.locator('.cloud-card-year')).toHaveText('2020');
    await expect(card).toContainText('Satıcı beyanı');
    await expect(card).toContainText('Boya bilinmiyor');
    await expect(card).toContainText('Değişen bilinmiyor');
    await guest.getByRole('button',{name:/QA araç ilanı ilanını incele/}).click();
    await expect(guest.getByRole('dialog')).toContainText('900.000');
    await expect(guest.getByRole('dialog')).toContainText('Bilinmiyor');
    await expect(guest.getByRole('dialog')).toContainText('Satıcıyla iletişim henüz uygulamada kullanılamıyor');
    const gallery = guest.getByRole('region', { name: 'İlan fotoğrafları' });
    const firstPhoto = gallery.locator('img').first();
    await expect(gallery.locator('img')).toHaveCount(8);
    await expect(firstPhoto).toHaveCSS('object-fit', 'contain');
    expect((await firstPhoto.boundingBox())!.width).toBeCloseTo((await gallery.boundingBox())!.width, 0);
    await expect(guest.getByRole('button',{name:'Yayından kaldır',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:/QA araç ilanı ilanını incele/}).click();
    await page.getByRole('button',{name:'Yayından kaldır',exact:true}).click();
    await guest.getByRole('button',{name:'Paneli kapat',exact:true}).click();
    await guest.getByRole('button',{name:'Yenile',exact:true}).click();
    await expect(guest.getByText('Henüz eşleşen ilan yok.',{exact:true})).toBeVisible();
    await context.close();await guestContext.close();
  });
}
