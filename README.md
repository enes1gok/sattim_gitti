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

- Çapraz/üstten araç görünümleri ve iki seçilebilir parça.
- “3D” düğmesiyle açılan gerçek mesh görüntüleyici: sürükleme, döndürme, yakınlaştırma, üstten bakış, sıfırlama ve klavye kontrolleri.
- Kenney CC0 genel SUV demosundaki parça işaretleri ve parça detayından modele dönüş.
- En fazla 20 MB, kendi içinde tüm dokularını içeren GLB 2.0 dosyalarını yerel olarak açma; model yüklemede otomatik parça eşleştirmesi yapılmaz.
- Fiyat/versiyon/konum ve ikonlu yıl, kilometre, vites, yakıt özeti.
- Açılır motor/teknik, kategorili donanım, ekspertiz/geçmiş ve ilan/satıcı bölümleri.
- Kaynağı açıkça örnek olarak gösterilen çizik fotoğrafı; incelenmeyen kaput durumu.
- Çoklu fotoğraf seçimi, silme ve dosya doğrulaması: JPG/PNG/WebP, dosya başına 12 MB, en fazla 8 fotoğraf.
- Beyaz Keşfet ana ekranı: kelime araması, üç hızlı kısayol, aramaya devam et kartı ve büyük fotoğraflı ilan kartı.
- Alttan açılan bütçe/konum/vites/kasa filtreleri; değişiklikleri uygulama veya vazgeçme, sonuçsuz aramayı sıfırlama.
- Keşfet / Takip / Favoriler / Hesabım navigasyonu; kayıtlı aramalar, kalıcı favoriler ve bildirim tercihleri. Gerçek bildirim gönderilmez.
- Sağ üstte her ekranda Araç sat girişi; fotoğraf hazırlama ve mevcut tarama akışına geçiş. İlan yayınlama bağlı değildir.
- Yönlendirmeli 3D tarama: üç tur, sekiz yön, bölüm başına altı ardışık kare (144 fotoğraf). Kamera/galeri, tekrar ve çözünürlük kontrolü, ışık/netlik ön uyarıları, IndexedDB ile taslak kurtarma.
- Yerel Mac Object Capture işi, gerçek ilerleme, iptal, başarısızlık sonrası tekrar deneme, OBJ → GLB dönüşümü, model görüntüleme ve indirme.

Son arama, takip edilen aramalar, bildirim seçimleri ve örnek ilan favorisi bu tarayıcının localStorage alanında saklanır. İlan fotoğrafları ve elle açılan modeller oturum belleğindedir. Yönlendirmeli tarama taslağı bu tarayıcının IndexedDB alanında kullanıcı silene kadar saklanır. “3D model oluştur” ile çekimler yalnızca aynı Mac'teki yerel servise aktarılır; üçüncü taraf bulutuna gönderilmez. Sunucu kopyaları 24 saat sonra, servis çalışırken en fazla bir dakikalık gecikmeyle veya sonraki açılışta silinir.

Gerçek hasar/boya tespiti bağlı değildir. 3D demo ilandaki Jeep'in birebir modeli değildir; kendi çekimlerinden üretilen model demo işaretlerini devralmaz. 144 kare çekim hedefidir; başarılı rekonstrüksiyonu garanti etmez. Aynı gerçek aracın 128 fotoğrafıyla motor → GLB → Chrome görüntüleme testi tamamlandı; yüzey/ölçü doğruluğu ve fiziksel kamera akışı ayrıca doğrulanmalıdır. [Gerçek araç testi](mobile-prototype/qa/real-car-test.md).

## Doğrulama

```sh
cd mobile-prototype
npm run build
npm run check:runtime
npm run test:reconstruction
```

Tarayıcı kontrolü ve görsel karşılaştırma: `mobile-prototype/design-qa.md`.

Yerel fotoğraftan 3D servisi, kurulum ve test sınırları: [Reconstruction README](mobile-prototype/server/README.md). Bu geliştirme hattı aynı Mac üzerinde çalışır; internet üzerinden telefonlara hizmet veren üretim altyapısı veya mağaza uygulaması değildir.

## Örnek ilan verisi

`mobile-prototype/src/listing-data.ts` fiyat, kilometre, donanım ve satıcı açıklaması için kurgusal veri kullanır. Sahibinden veya Arabam.com ile veri entegrasyonu yoktur. Belge sunulmayan hasar/boya/bakım alanları bilinmiyor veya belge bekleniyor olarak görünür.

1.3 T4 150 HP DCT FWD motor bilgileri için [Jeep 2021 Compass kataloğu](https://www.jeep.com.tr/content/dam/jeep/tr/kataloglar/2021/eylul/Compass_MY21_80p_TR_REV_KULAKCIKSIZ_2_.pdf) referans alınmıştır; bu, örnek aracın kimliğini, donanımını veya durumunu doğrulamaz.

## Branch ayrımı

Bu branch (`codex/vehicle-3d-lab`) deneysel 3D görüntüleme, yönlendirmeli çekim, yüksek ayrıntılı yerel geometri ve Gaussian görünüm hattını saklar. Ana geliştirme branch’inde yalnızca fotoğraf yükleme akışı vardır. Kaynak fotoğraf ve üretilen modeller git dışındadır.

## HD fotoğraf turu (deneysel branch)

`codex/vehicle-3d-lab` üzerinde ana inceleme, kullanıcının özgün fotoğraflarından
oluşan HD turdur. Çevre turunda sekiz yön × altı kare tamamlanınca 48 fotoğraflık
tur, 3D servisine bağlanmadan açılır. Eksik çekimler fotoğraf önizlemesi olarak
gösterilir. Sürükleme, klavye kontrolleri, 2× ayrıntı görünümü ve özgün dosyayı
indirme desteklenir. Yön sayıları geometrik kapsam doğrulaması değildir.

Taslaklar IndexedDB'de saklanır. Yüksek/alçak açı turlarıyla tamamlanan 144 karelik
plan, isteğe bağlı yerel 3D üretimi içindir. HD turda yapay kare veya yüzey üretilmez.
