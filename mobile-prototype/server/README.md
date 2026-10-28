# Yerel fotoğraftan 3D üretimi

macOS, Object Capture destekli donanım ve Xcode gerektirir. Bu Mac'te donanım desteği doğrulandı ve Swift motoru derlendi. Node.js 22.18+ gerekir; test edilen sürüm 26.3.

Proje dizininde:

```sh
npm run build:reconstruction
npm run dev:reconstruction
```

Vite önizlemesi ayrı süreçte `http://127.0.0.1:4173/` üzerinde çalışır. API yalnızca `127.0.0.1:4180` adresine bağlanır ve bu önizlemenin origin değerini kabul eder. Kamera kullanıcı izni ister; desteklenmezse telefon kamerası/dosya seçici ve galeri kullanılabilir. Kamera kapatılınca veya sekme arka plana geçince medya izleri durdurulur.

Akış: JPG/PNG → yerel iş → RealityKit PhotogrammetrySession (sequential, high feature sensitivity, otomatik nesne maskesi, reduced çıktı) → OBJ/dokular → Cesium obj2gltf (secure, unlit) → kendi dokularını içeren GLB → Three.js görüntüleyici.

## Çekim ve saklama

- İki tur × sekiz yön × en az dört ardışık kare: 64 başlangıç karesi. Örtüşme uygulama tarafından geometrik olarak ölçülmez; bu bir çekim planıdır. Yansıyan veya eksik yüzeyler daha çok çekim gerektirebilir.
- JPG/PNG; en az 1600 × 900 px; fotoğraf başına 12 MB, tarama başına 512 MB ve 160 fotoğraf. HEIC önce JPG/PNG olarak dışa aktarılmalıdır.
- Işık/netlik uyarıları basit ön kontrol ölçümleridir; kalibre edilmiş kalite veya hasar tespiti değildir. Aynı dosyanın tekrar kullanılması hem istemcide hem sunucuda reddedilir.
- Taslak IndexedDB'de kullanıcı silene kadar kalır. Kayıt başarısızsa uygulama uyarır. Normal ilan fotoğrafı akışı session-only davranışını korur.
- Sunucu kopyaları `.local/reconstructions/` altında, git dışında tutulur. 24 saatte sona erer; çalışan servis dakikalık taramayla veya bir sonraki başlangıçta siler.
- Aynı anda bir üretim; en fazla beş saklanan iş; çıktı GLB en fazla 20 MB. Üretim bir saatte zaman aşımına uğrar. İşlem iptal edilince sunucu dosyaları temizlenir; tarayıcı taslağı korunur.
- Servis yeniden açılırsa yarım kalan işler başarısız sayılır; istemcinin çekimleriyle tekrar başlatılabilir. Bekleyen fotoğraflara örnek bulgu veya uydurma model atanmaz.

## API

`GET /health`, `POST /jobs` (multipart capture manifest + UUID alanlı fotoğraflar), `GET /jobs/:id`, `GET /jobs/:id/model`, `DELETE /jobs/:id`.

İlerleme gerçek Object Capture olaylarından gelir; dönüşüm ayrı aşamadır. Model, GLB doğrulamasını ve kaydı tamamlamadan `ready` olmaz. İstemci sunucudaki işi sorgular ve bağlantı kesilince yeniden dener. Model indirebilir veya mevcut görüntüleyicide açılabilir; otomatik parça eşleştirmesi yoktur.

## Doğrulama ve sınırlar

`npm run test:reconstruction` ile 12 test: model/çekim kuralları, origin engelleme, geçersiz/tekrarlı çekim, iptal, eşzamanlı iş engeli, motor hatası ve test motorunun OBJ çıktısının GLB'ye dönüştürülmesi. Dönüşüm testi kontrollü test motoru kullanır; fotogrametrik doğruluğu test etmez.

Gerçek Swift motorunda destek kontrolü ve boş çekimin reddi doğrulandı. iPhone/Pixel tarayıcı önizlemelerinde ekleme, eksik çekimde engelleme, taslak kurtarma, yön/tur seçimi ve silme kontrol edildi. Ayrıca 3DRealCar'daki aynı Volkswagen'in 128 gerçek JPEG karesiyle üretim/dönüşüm/Chrome görüntüleme testi tamamlandı: reduced 100 sn / 5,45 MB, medium 108 sn / 17,59 MB. Ayrıntılı kapsam ve kalite kayıpları [gerçek araç testi raporunda](../qa/real-car-test.md). Bu test fiziksel telefon kamerasını, uygulamada yönlendirmeli çekimle veri toplamayı veya ölçü/hasar doğruluğunu kapsamaz. Cam, parlak boya, düşük doku ve yetersiz örtüşme eksik veya bozuk yüzeylere yol açabilir. Çıktı ekspertiz raporu değildir.

Bu aynı Mac üzerinde çalışan geliştirme hattıdır. Telefonlardan internette kullanılacak sürüm için HTTPS, kullanıcı kimliği/veri izolasyonu, uzak iş kuyruğu ve işleyici, ölçekleme ve fiziksel cihaz testleri ayrıca gerekir. Statik Sites çıktısı Node/Swift servisini dağıtmaz. Loopback servisini herkese açık üretim API'si olarak yayımlamayın.

Kaynaklar: [Apple çekim rehberi](https://developer.apple.com/documentation/realitykit/capturing-photographs-for-realitykit-object-capture), [PhotogrammetrySession iş akışı](https://developer.apple.com/documentation/realitykit/creating-3d-objects-from-photographs), [Cesium obj2gltf](https://github.com/CesiumGS/obj2gltf).
