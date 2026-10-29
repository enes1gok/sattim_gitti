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
- Beyaz Keşfet ana ekranı: kelime araması, üç hızlı kısayol, aramaya devam et kartı ve büyük fotoğraflı ilan kartı.
- Alttan açılan bütçe/konum/vites/kasa filtreleri; değişiklikleri uygulama veya vazgeçme, sonuçsuz aramayı sıfırlama.
- Keşfet / Takip / Favoriler / Hesabım navigasyonu; kayıtlı aramalar, kalıcı favoriler ve bildirim tercihleri. Gerçek bildirim gönderilmez.
- Sağ üstte her ekranda Araç sat girişi; fotoğraf ekleme ve silme. İlan yayınlama bağlı değildir.

Son arama, takip edilen aramalar, bildirim seçimleri ve örnek ilan favorisi localStorage alanında saklanır. İlan fotoğrafları bu oturumda cihazda tutulur; sayfa yenilenince kaybolur. Fotoğraflardan otomatik analiz veya model üretilmez.


## Doğrulama

```sh
cd mobile-prototype
npm run build
npm run check:runtime
```

Tarayıcı kontrolü ve görsel karşılaştırma: `mobile-prototype/design-qa.md`.


## Örnek ilan verisi

`mobile-prototype/src/listing-data.ts` fiyat, kilometre, donanım ve satıcı açıklaması için kurgusal veri kullanır. Sahibinden veya Arabam.com ile veri entegrasyonu yoktur. Belge sunulmayan hasar/boya/bakım alanları bilinmiyor veya belge bekleniyor olarak görünür.

1.3 T4 150 HP DCT FWD motor bilgileri için [Jeep 2021 Compass kataloğu](https://www.jeep.com.tr/content/dam/jeep/tr/kataloglar/2021/eylul/Compass_MY21_80p_TR_REV_KULAKCIKSIZ_2_.pdf) referans alınmıştır; bu, örnek aracın kimliğini, donanımını veya durumunu doğrulamaz.

## Branch ayrımı

Ana geliştirme `main` üzerinde fotoğraf yükleme akışıyla devam eder. Deneysel 3D görüntüleme, yönlendirmeli çekim ve yerel model işleyicisi `codex/vehicle-3d-lab` branch’inde (`32f23bd`) saklanır. 3D bağımlılıkları ve servisleri ana uygulamada çalışmaz.
