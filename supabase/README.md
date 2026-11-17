# Araç kataloğu

Hedef proje: [hsentdihwpkmgvavzyiq](https://supabase.com/dashboard/project/hsentdihwpkmgvavzyiq).

`vehicle_catalog_sources → vehicle_makes → vehicle_models → vehicle_model_years → vehicle_variants`

Katalog, ilanlardan bağımsızdır. Fiyat, kilometre, sahiplik, boya/hasar ve bakım
geçmişi burada tutulmaz. Uygulamadaki mevcut ilanlar hâlâ örnektir; katalog
yüklenmesi canlı ilan veya takip entegrasyonu sağlamaz.

## Başlangıç verisi

- **VehiclesDB 2026.10.4:** 315 marka, 5.541 binek otomobil modeli; CC BY 4.0.
- **Tofaş üretici tarihçesi:** 1 marka, 4 model adı (Murat 131, Şahin, Kartal, Doğan).
- Toplam **316 marka, 5.545 model**. Türkiye pazarı için eksiksiz katalog olduğu
  iddia edilmez. Motosiklet/hafif ticari diğer kategoriler henüz aktarılmadı.
- Kaynak model yılı, motor ve Türkiye donanım paketlerini sağlamıyor. Bu nedenle
  `vehicle_model_years` ve `vehicle_variants` başlangıçta boştur. Üretim başlangıç
  yılını bütün model yıllarına genişleterek sahte kapsam oluşturmayın.
- `observed_countries` başka ülkelerdeki sicil kayıtlarını gösterir; Türkiye'de
  satışta olma, Türkiye versiyonu veya güncel satış kanıtı değildir.
- Her kayıt kaynak kimliği/sürümünü korur. Her yeniden aktarım doğal anahtarlarla
  `UPSERT` yapar, mevcut UUID'leri korur; kullanıcı referansları bozulmaz.

Sabitlenmiş commit, özgün dosya özetleri ve dönüşüm açıklaması
`mobile-prototype/data/vehiclesdb/snapshot.json` içindedir. Projeksiyon yalnızca
kimlik/adlar, gövde tipleri, alternatif adlar, kaynaklar ve gözlenen ülkeleri içerir.
Dosyalar ağ erişimi gerektirmeden tekrar yüklenebilir.

29 Ekim 2026 doğrulaması: hedef projede 316 marka / 5.545 model / 0 model yılı /
0 versiyon. Tam aktarım iki kez çalıştırıldı; adetler ve mevcut UUID'lerin birleşik
özeti değişmedi. `tests/vehicle_catalog.sql` bütünlük, RLS, gerçek `anon` okuması ve
iki istemci rolünün yazma yetkisi olmamasını doğruladı. Dört yerel veri/aktarım
testi de geçti. Sonuç ekranı: `mobile-prototype/qa/catalog-database.png`.

## Yerelde yeniden oluşturma

Depo kökünden:

```sh
npm --prefix mobile-prototype run catalog:prepare
SUPABASE_TELEMETRY_DISABLED=1 supabase start
SUPABASE_TELEMETRY_DISABLED=1 supabase db reset --local
SUPABASE_TELEMETRY_DISABLED=1 supabase db query --local --file supabase/tests/vehicle_catalog.sql
npm --prefix mobile-prototype run test:catalog
```

`db reset --local` yalnızca sıfırlanabilir yerel geliştirme veritabanı içindir.
`seed.sql` üretilen ve git'e alınmayan dosyadır; üreticiyi çalıştırmadan yerel reset
yapmayın. Kaynak JSON'un lisans/sürüm/adet kontrolleri aktarım öncesinde çalışır.

Mevcut uzak projeye önce tablo yapısı incelendikten sonra migration uygulanır,
ardından üretilen `seed.sql` çalıştırılır. Üretim ortamında `db reset` kullanmayın.
SQL Editor ile uygulanmış şema için, ileride CLI üzerinden migration çalıştırmadan
önce doğru hesaba giriş yapıp projeyi bağlayın ve geçmişi eşleştirin:

```sh
SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair 20261028220447 --status applied --linked
```

Bu komut yalnızca şemanın tamamının zaten uygulandığı doğrulandıysa kullanılmalıdır.

## Uygulamadan okuma

Tüm beş tablo RLS ile korunur. `anon` ve `authenticated` sadece `SELECT` yapabilir.
Katalog yazımları yalnızca güvenilir yönetim/backend bağlantısından yapılır;
frontend'e `service_role`, veritabanı parolası veya secret key konmaz.

Data API üzerinden marka listesi:
`/rest/v1/vehicle_makes?select=id,slug,name&order=name.asc`

Seçilen markanın modelleri:
`/rest/v1/vehicle_models?select=id,slug,name,body_types,aliases&make_id=eq.MARKA_UUID&order=name.asc`

İsteklerde projenin publishable key'i `apikey` başlığında kullanılır. Toplu
okumalarda sunucunun 1.000 satır sınırına karşı sayfalama gerekir. Marka/model
seçicisi gerçek ilan oluşturma formunda bu kataloğa bağlıdır. Serbest metin araması
yayımlanmış gerçek ilanlarda sunucu tarafında uygulanır.

## Kaynak bildirimleri

Veri kullanıcıya gösterilmeye başlandığında görünür **Vehicle data by
[VehiclesDB](https://vehiclesdb.com)** atfı eklenmelidir. CC BY 4.0 lisansı ve
değişiklik bildirimi korunmalıdır. Üst kaynakların zorunlu atıfları da
`mobile-prototype/data/vehiclesdb/ATTRIBUTION.md` içindedir ve
`vehicle_catalog_sources.attribution` alanına aynen aktarılır. Uygulamanın kaynaklar
ekranında bu bildirimlerin tamamını erişilebilir tutun.

[Kaynak depo](https://github.com/vehiclesdb/vehiclesdb),
[Tofaş tarihçesi](https://www.tofas.com.tr/Hakkimizda/Tarihce).

Sahibinden/arabam.com için bu aktarım bir tarayıcı/scraper içermez. Sağlayıcının
resmî API'si, izinli dışa aktarımı veya lisanslı beslemesi alındığında, dış kimlikleri
katalog kimliklerine eşleştiren ayrı bir adaptör gerekir. Sahibinden'in kurumsal
sözleşmesi kullanıcıların kendi ilanlarını veri indirme/API yoluyla taşımasını
açıklar; bu bütün pazarın veya katalog ağacının açık API'si anlamına gelmez.


## Bağlı ilan uygulaması

Varsayılan ekran `CloudMarketplace.tsx`; kurgusal örnek deneyim `?demo=1`
veya Hesabım → Örnek deneyimi incele yolundadır. E-posta/parola girişi, kayıt,
şifre yenileme, ilan taslağı, yayımlama/yayından kaldırma, fotoğraflar, favoriler
ve kayıtlı aramalar gerçek projeye bağlıdır. Kayıt ve şifre yenilemenin dış
kullanıcılara e-posta gönderebilmesi için doğrulanmış gönderici domaini + SMTP
kurulmalıdır. Site URL ve Redirect URLs de dağıtım adresiyle ayarlanmalıdır.
SMTP kurulumu olmadan herkese açık kayıt hazır diye bildirmeyin.

Tablolar: `listings`, `listing_photos`, `listing_favorites`, `saved_searches`.
`marketplace_listings`, RLS'yi koruyan `security_invoker` görünümüdür; e-posta,
telefon, satıcı adı veya `owner_id` alanını içermez. Misafir rolü ana tablodan
`owner_id` sütununu da okuyamaz. Hesap bilgilerinin kaynağı Supabase Auth'tur.

Taslak ve arşiv ilanlar yalnızca sahibine görünür; sahibi başkasına devredilemez.
Yayımlama, Storage kaydı bulunan sekiz ayrı fotoğraf pozisyonunu veritabanında
zorunlu kılar. Boya/değişen bilgileri satıcı beyanıdır; görseller otomatik olarak
hasar veya bölge doğrulamasından geçirilmez. Sunucuda kullanıcı adına üretilmiş
hasar sonucu yoktur.

`listing-photos` özel bucket: JPG/PNG/WebP, dosya başına 8 MB. İstemci fotoğrafı
JPEG'e yeniden çizer (en uzun kenar 2.000 px), böylece EXIF konumu temizlenir.
Yalnız ilan sahibi taslağa dosya ekleyebilir. Yayımlanmış ilanların görselleri
15 dakikalık imzalı URL ile gösterilir. Yayından kaldırınca yeni URL üretimi
engellenir; daha önce üretilen bir URL süresi bitene kadar erişilebilir kalabilir.
Fotoğraf değiştirmek için önce ilanı taslağa almak gerekir.

Favoriler ve aramalar oturum sahibine özeldir; tarayıcıdaki eski örnek kayıtlar
başka hesaba otomatik aktarılmaz. Otomatik arama taraması, fiyat alarmı, e-posta
bildirimleri ve kullanıcı mesajlaşması bu değişikliğin kapsamı dışındadır.

Doğrulama:

- Canlı projede `supabase/tests/marketplace-policies.sql`: iki farklı kullanıcı
  kimliği + misafir için RLS, özel taslaklar, sekiz fotoğraf kuralı, yayın/arşiv,
  favori/arama izolasyonu. Tüm test kayıtları aynı transaction'da geri alınır.
  Storage metadata fixture'ı bir gerçek dosya yükleme testi değildir.
- `npx playwright test tests/cloud-marketplace.spec.ts --workers=1`: iPhone ve
  Android ekranları; yalıtılmış HTTP yanıtları ile girişten ilana, fotoğraf
  zorunluluğuna, yayın/görüntüleme ve arşivlemeye kadar UI sözleşmesi.
- Gerçek Auth oturumu + Storage aktarımıyla iki hesap testi henüz geçmedi.
  `MARKETPLACE_LIVE_QA=1 node --test tests/marketplace-live.test.mjs` bu amaçla
  hazırlanmıştır; `.local/marketplace-qa.json` içinde desteklenen Auth yönetim
  araçlarıyla oluşturulmuş iki çalışır, geçici test hesabı gerektirir. Parolaları
  git'e koymayın; bu flag olmadan canlı test otomatik çalışmaz.
- Derleme ve 28 korumalı mobil runtime dosyasının bütünlük kontrolü geçti.

SMTP kurulumu: https://resend.com/docs/send-with-supabase-smtp

Geçici QA kayıtlarının temizliği: canlı Auth testi için SQL ile oluşturulan iki
`example.invalid` kaydı oturum açamadığı için teste alınmadı. Bunları değiştiren
iç Auth alanı güncellemesi ve ayrıcalıklı test fonksiyonu otomatik denetimden
geçmedi; fonksiyon yayımlanmadı. Kullanıcının açık silme onayından sonra, yalnız bu iki UUID ve e-posta
eşleştirilerek Supabase SQL Editor üzerinden temizlendi. Silme sonucu 2;
yeniden sorguda kalan QA kullanıcısı ve identity sayısı 0. Yerel test parolalarını
içeren git dışı dosya da kaldırıldı.

Son kontrol: katalog testleri (4), paketleme testleri (4), bağlı UI testleri (2)
ve ayrı örnek deneyim regresyonları (16) geçti; toplam 26 test. Misafir Data API
ilan sorgusu HTTP 200 dönüyor. Auth ayarlarında e-posta girişi/kayıt açık ve
e-posta doğrulaması zorunlu; bu koruma değiştirilmedi. Canlı Auth+Storage testi
başarılı olarak raporlanmamalıdır; SMTP ve çalışır test hesapları bekleniyor.
