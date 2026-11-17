# Sattım Gitti

Seçilen beyaz tasarımın etkileşimli mobil prototipi.

Uygulama: `mobile-prototype/`. Önizleme iPhone ve Pixel 10 arasında geçiş yapar. Bu proje henüz mağazaya yüklenebilir iOS/Android uygulaması değildir.

## Çalıştırma

```sh
cd mobile-prototype
npm ci
npm run dev -- --host 127.0.0.1 --port 4173
```

## Çalışan akışlar

- Fiyat/versiyon/konum ve ikonlu yıl, kilometre, vites, yakıt özeti.
- Açılır motor/teknik, kategorili donanım, ekspertiz/geçmiş ve ilan/satıcı bölümleri.
- Çoklu fotoğraf seçimi, silme ve dosya doğrulaması: JPG/PNG/WebP, dosya başına 12 MB, en fazla 8 fotoğraf.
- Beyaz Keşfet ana ekranı: kelime araması, aile arabası/büyük bagaj/düşük maliyet ihtiyaç kısayolları, aramaya devam et kartı ve büyük fotoğraflı ilan kartı. Kategorilerin örnek ölçütleri sonuçlarda gösterilir.
- Karar desteği: iki kurgusal araç senaryosunun karşılaştırması ve değiştirilebilir yakıt + bakım bütçesi hesabı. Fiyat geçmişi ve piyasa değerlendirmesi için henüz veri kaynağı yoktur; rakamlar ve karşılaştırma senaryosu gerçek araç verisi değildir.
- Alttan açılan bütçe/konum/vites/kasa filtreleri; değişiklikleri uygulama veya vazgeçme, sonuçsuz aramayı sıfırlama.
- Keşfet / Takip / Favoriler / Hesabım navigasyonu; kayıtlı aramalar, kalıcı favoriler ve bildirim tercihleri. Gerçek bildirim gönderilmez.
- Sağ üstte her ekranda Araç sat girişi; fotoğraf ekleme ve silme. İlan yayınlama bağlı değildir.

Son arama, takip edilen aramalar, bildirim seçimleri ve örnek ilan favorisi localStorage alanında saklanır. İlan fotoğrafları bu oturumda cihazda tutulur; sayfa yenilenince kaybolur. Fotoğraflardan otomatik analiz veya model üretilmez.


## Doğrulama

```sh
cd mobile-prototype
npm run build
npm run check:runtime
npm run test:decision
```

Tarayıcı kontrolü ve görsel karşılaştırma: `mobile-prototype/design-qa.md`.


## Örnek ilan verisi

`mobile-prototype/src/listing-data.ts` fiyat, kilometre, donanım ve satıcı açıklaması için kurgusal veri kullanır. Sahibinden veya Arabam.com ile veri entegrasyonu yoktur. Belge sunulmayan hasar/boya/bakım alanları bilinmiyor veya belge bekleniyor olarak görünür.

1.3 T4 150 HP DCT FWD motor bilgileri için [Jeep 2021 Compass kataloğu](https://www.jeep.com.tr/content/dam/jeep/tr/kataloglar/2021/eylul/Compass_MY21_80p_TR_REV_KULAKCIKSIZ_2_.pdf) referans alınmıştır; bu, örnek aracın kimliğini, donanımını veya durumunu doğrulamaz.

## Araç kataloğu veritabanı

Supabase'de 316 marka ve 5.545 model içeren, kaynak ve lisans bilgileri tutulan
ortak katalog oluşturuldu. Model yılı/motor/donanım tabloları hazırdır; bu alanlar
doğrulanmış veri gelene kadar boştur. Katalog, gerçek ilan oluşturma formundaki marka/model seçimine bağlandı.
Kullanıcı girişi, özel taslaklar, ilan yayımlama/görüntüleme, fotoğraf yükleme,
favoriler ve kayıtlı aramalar Supabase üzerinden çalışır. Herkese açık kayıt için
gönderici domaini ve SMTP kurulumu ile canlı uçtan uca test hâlâ bekliyor. Yeniden aktarım, erişim kuralları ve kaynak bildirimleri:
[Veritabanı README](supabase/README.md).

## HD fotoğraf turu ve ek 3D görünüm

Onaylanan HD tur main'e birleştirildi. Hesabım → Fotoğraflarını hazırla üzerinden
HD tur çekimine geçilebilir. İlk çevre turu (8 yön × 6 kare = 48 özgün fotoğraf)
3D servisini beklemeden açılır. Eksik çekimler fotoğraf önizlemesi olarak gösterilir.
Sürükleme, klavye, 2× ayrıntı ve orijinal fotoğraf indirme desteklenir.
Kapsam sayıları geometrik doğrulama değildir; yapay kare oluşturulmaz.

Tur taslakları IndexedDB'de cihazda kalır; yayımlanan ilan fotoğraflarından ayrıdır.
İsteğe bağlı 3D üretimi için yüksek/alçak turlarla 144 kare gerekir. Bu işlem yalnızca
ayrıca başlatılan yerel Mac işleyicisinde çalışır; statik yayına otomatik kurulmaz.
Kurulum ve sınırlamalar: [Yerel işleyici](mobile-prototype/server/README.md).
