# Yerel fotoğraftan 3D üretimi

macOS, Object Capture destekli donanım ve Xcode gerektirir. Bu Mac'te donanım desteği doğrulandı ve Swift motoru derlendi. Node.js 22.18+ gerekir; test edilen sürüm 26.3.

Proje dizininde:

```sh
npm run build:reconstruction
npm run dev:reconstruction
```

Vite önizlemesi ayrı süreçte `http://127.0.0.1:4173/` üzerinde çalışır. API yalnızca `127.0.0.1:4180` adresine bağlanır ve bu önizlemenin origin değerini kabul eder. Kamera kullanıcı izni ister; desteklenmezse telefon kamerası/dosya seçici ve galeri kullanılabilir. Kamera kapatılınca veya sekme arka plana geçince medya izleri durdurulur.

Akış: JPG/PNG → yerel iş → RealityKit PhotogrammetrySession (sequential, high feature sensitivity, otomatik nesne maskesi, custom çıktı: 250 bin poligon / 8K üst sınırı; eski macOS’ta full) → OBJ/dokular → 4K renk atlası, JPEG 96 / 4:4:4 → Cesium obj2gltf (secure, unlit) → kendi dokularını içeren GLB → Three.js görüntüleyici. Fotoğraflanmış ışığı içeren unlit dokulara ikinci bir filmik renk dönüşümü uygulanmaz. Destekleyen tarayıcılarda ImageCapture ile gerçek kamera fotoğrafı alınır; desteklenmezse yüksek çözünürlüklü video karesi kullanılır. Bu yol fiziksel telefonlarda henüz doğrulanmadı.

## Gerçekçi görünüm

Geometri hazır olduğunda **Gerçekçi görünüm hazırla** ayrıca başlatılır. macOS 26'da Object Capture fotoğraflardan kamera konumlarını, dönüşlerini, iç kalibrasyonu ve seyrek başlangıç noktalarını çıkarır. `server/appearance.mjs` bu veriyi Nerfstudio biçimine çevirerek yerel Brush işleyicisini çalıştırır. Hazır veri seti kameraları veya üçüncü taraf görüntü yüklemesi gerekmez.

Bu Mac'te [resmî Brush v0.3.0](https://github.com/ArthurBrussee/brush/releases/tag/v0.3.0) Apple Silicon ikilisi `.local/tools/brush/brush-app-aarch64-apple-darwin/brush_app` altında kuruldu. İndirilen arşiv SHA-256: `65b2631398c839be3c1d4d7160fe2326389dec87830aac0710985e6690a1048c`. İkili git dışında kalır; başka kurulumlarda bu yol yoksa arayüz işleyicinin kullanılamadığını gösterir. Derleme otomatik indirme veya üçüncü taraf çalıştırma yapmaz.

- Metal yardımcı programı gerçek OBJ'yi tahmin edilen her kamera açısından çizerek araç maskeleri üretir. Eğitim kopyaları, kaynak RGB ve bu maskeden hazırlanmış şeffaf PNG'lerdir; görüntü boyutuyla birlikte kamera iç parametreleri de ölçeklenir. Kaynak JPEG/PNG dosyaları değiştirilmez.
- 12.000 eğitim adımı, en fazla 180.000 Gaussian, en fazla 1280 px eğitim görüntüsü; kaynak fotoğraflar korunur. Metal yardımcı programı `build:reconstruction` ile `.local/bin/render-masks` olarak derlenir. Hem bu program hem Brush hazır olmadan gelişmiş işleyici kullanılabilir sayılmaz.
- En az 32 kalibre edilmiş kamera ve girdilerin en az %80'i için eşleşme gerekir. API orijinalleri byte-for-byte saklar; EXIF yönü farklıysa işleme kopyasını kameralar tahmin edilmeden önce düzeltir. Doğrudan CLI girdisi dik konumda olmalıdır.
- Aracın gerçek OBJ yüzey sınırları kadrajı belirler; geniş çekim hacmi kullanılmaz. Yüzeyden uzak, aşırı büyük ve çok düşük opaklıklı örnekler ayıklanır. Tutulan Gaussian satırlarının renk/yansıma katsayıları yeniden yazılmaz. Bu işlem ölçü veya hasar doğrulaması değildir.
- Son görünüm binary PLY olarak en fazla 50 MB / 200.000 noktayla doğrulanır. Spark görüntüleyicisi ihtiyaçta yüklenir ve yalnızca değişiklik olduğunda çizer; geometri alternatifi korunur.
- Eğitim geometri üretiminden çok daha uzun sürebilir. Geometri bu sırada açılabilir/indirilebilir. Aynı anda başka bir tarama başlatılamaz. Eğitim başarısız olduğunda geometri korunur; taramanın silinmesi iki işi de durdurur.
- Kamera iç parametresi çıkarılamayan veya desteklenmeyen fotoğraflarda gerçekçi görünüm başarısız olabilir. Her aracın aynı kalitede çıkacağı varsayılmaz.

## Çekim ve saklama

- Üç tur × sekiz yön × altı ardışık kare: 144 karelik çekim hedefi. Örtüşme uygulama tarafından geometrik olarak ölçülmez; bu bir çekim planıdır. Yansıyan veya eksik yüzeyler daha çok çekim gerektirebilir.
- JPG/PNG; en az 1600 × 900 px; fotoğraf başına 12 MB, tarama başına 512 MB ve 160 fotoğraf. HEIC önce JPG/PNG olarak dışa aktarılmalıdır.
- Işık/netlik uyarıları basit ön kontrol ölçümleridir; kalibre edilmiş kalite veya hasar tespiti değildir. Aynı dosyanın tekrar kullanılması hem istemcide hem sunucuda reddedilir.
- Taslak IndexedDB'de kullanıcı silene kadar kalır. Kayıt başarısızsa uygulama uyarır. Normal ilan fotoğrafı akışı session-only davranışını korur.
- Sunucu kopyaları `.local/reconstructions/` altında, git dışında tutulur. 24 saatte sona erer; çalışan servis dakikalık taramayla veya bir sonraki başlangıçta siler.
- Aynı anda bir üretim; en fazla beş saklanan iş; çıktı GLB en fazla 20 MB. Üretim bir saatte zaman aşımına uğrar. İşlem iptal edilince sunucu dosyaları temizlenir; tarayıcı taslağı korunur.
- Servis yeniden açılırsa yarım kalan işler başarısız sayılır; istemcinin çekimleriyle tekrar başlatılabilir. Bekleyen fotoğraflara örnek bulgu veya uydurma model atanmaz.

## API

`GET /health`, `POST /jobs` (multipart capture manifest + UUID alanlı fotoğraflar), `GET /jobs/:id`, `GET /jobs/:id/model`, `POST /jobs/:id/appearance`, `GET /jobs/:id/appearance`, `DELETE /jobs/:id`.

İlerleme gerçek Object Capture olaylarından gelir; dönüşüm ayrı aşamadır. Model, GLB doğrulamasını ve kaydı tamamlamadan `ready` olmaz. İstemci sunucudaki işi sorgular ve bağlantı kesilince yeniden dener. Model indirebilir veya mevcut görüntüleyicide açılabilir; otomatik parça eşleştirmesi yoktur.

## Doğrulama ve sınırlar

`npm run test:reconstruction` ile 30 test: model/çekim kuralları, origin engelleme, geçersiz/tekrarlı çekim, iptal, eşzamanlı iş engeli, motor hatası, OBJ/GLB dönüşümü, JPEG renk/çözünürlük korunması, kamera fotoğrafı/fallback, kamera dönüşüm matrisi, Gaussian sınırları, yüzey temizliği, şeffaf eğitim kopyalarında kalibrasyon/kaynak korunması, perspektifte tam kadraj ve ek eğitim sırasında geometrinin korunması. API testleri kontrollü motorlar kullanır; fotogrametrik doğruluğu test etmez.

Gerçek Swift motorunda destek kontrolü ve boş çekimin reddi doğrulandı. iPhone/Pixel tarayıcı önizlemelerinde ekleme, eksik çekimde engelleme, taslak kurtarma, yön/tur seçimi ve silme kontrol edildi. Ayrıca 3DRealCar'daki aynı Volkswagen'in 128 gerçek JPEG karesiyle üretim/dönüşüm/Chrome görüntüleme testi tamamlandı: reduced 100 sn / 5,45 MB, medium 108 sn / 17,59 MB. Ayrıntılı kapsam ve kalite kayıpları [gerçek araç testi raporunda](../qa/real-car-test.md). Bu test fiziksel telefon kamerasını, uygulamada yönlendirmeli çekimle veri toplamayı veya ölçü/hasar doğruluğunu kapsamaz. Cam, parlak boya, düşük doku ve yetersiz örtüşme eksik veya bozuk yüzeylere yol açabilir. Çıktı ekspertiz raporu değildir.

Bu aynı Mac üzerinde çalışan geliştirme hattıdır. Telefonlardan internette kullanılacak sürüm için HTTPS, kullanıcı kimliği/veri izolasyonu, uzak iş kuyruğu ve işleyici, ölçekleme ve fiziksel cihaz testleri ayrıca gerekir. Statik Sites çıktısı Node/Swift servisini dağıtmaz. Loopback servisini herkese açık üretim API'si olarak yayımlamayın.

29 Ekim kalite turunda aynı 128 kareyle full geometri 100.000 üçgen / 4K / yaklaşık 6,06 MB verdi. Maskesiz Gaussian denemesi zeminde uzantılar ve yumuşak yan yüzeyler gösterdi. Maskeli 4.000 adımlık karşılaştırma 411 sn sürdü; temizlik sonrası 171.023 nokta / 40,36 MB verdi ve zemin kalıntılarını belirgin azalttı. 4.000 → 12.000 adımlı devam çalışması 800 sn / 173.133 nokta / 40.860.939 bayt verdi; sıfırdan 12.000 adım süresi değildir. Yan yüzeylerde hâlâ yumuşama vardır. Yoğun geometri karşılaştırması 142.968 üçgen / gerçek 4K atlas / 8.236.312 bayt GLB verdi. Kapsam denetimi, eşleşmiş kameralarda 60° üzeri çevre boşluğu veya 10° altı yükseklik aralığında ek eğitimi reddeder; bu eşikler yüzey doğruluğunu kanıtlamaz. İlk gece çalışmasının 24.966 sn duvar saati etkin GPU süresinden ayrılmadığı için üretim gecikmesi olarak kullanılmaz. Ayrıntılar ve kalan görsel hatalar gerçek araç raporundadır.

Kaynaklar: [Apple çekim rehberi](https://developer.apple.com/documentation/realitykit/capturing-photographs-for-realitykit-object-capture), [fotoğraftan tahmin edilen kamera iç parametreleri](https://developer.apple.com/documentation/realitykit/photogrammetrysession/pose/intrinsics), [Cesium obj2gltf](https://github.com/CesiumGS/obj2gltf), [Brush](https://github.com/ArthurBrussee/brush), [Spark](https://sparkjs.dev/).
