# Gerçek araç fotoğraflarıyla üretim testi

Tarih: 28–29 Ekim 2026. Kapsam: gerçek fotoğraf → Object Capture → OBJ → GLB → Chrome'da uygulamanın gerçek Vehicle3D bileşeni.

Sonuç: **teknik hat geçti; yüksek yüzey doğruluğu ve hasar tespiti doğrulanmadı.**

## Girdi ve kaynak

Chrome'da [3DRealCar proje sayfası](https://xiaobiaodu.github.io/3drealcar/) ve [indirme sayfası](https://xiaobiaodu.github.io/3drealcar/download.html) üzerinden aynı araca ait çekim seti bulundu. Kaynak arşiv `0-200.zip`, çekim kimliği `2024_07_09_04_20_54`.

57,64 GB arşivin tamamı indirilmedi. ZIP64 indeksinin gerekli bölümü ve tek araca ait seçilmiş JPEG/kamera bilgileri HTTP Range ile alındı. JPEG küçük önizlemesi ve veri setinin hazır OBJ/3D modelleri girdi olarak kullanılmadı.

- Aynı siyah Volkswagen'in ön, arka, sağ, sol ve farklı yüksekliklerinden 128 özgün kare.
- Her kare 1920 × 1440; girdi toplamı 172.150.927 bayt (164,18 MiB).
- Kare adları ve SHA-256 özetleri `.local/real-car-test/test-result.json` içinde kayıtlı.
- Kaynak kareler yeniden boyutlandırılmadı veya üretken görselle değiştirilmedi. Kamera JSON dosyaları indirildi ama bu testte motora yalnızca JPEG'ler verildi; veri setinin derinlik ve hazır geometri sonuçları kullanılmadı.
- 16 açılık kontrol görseli: `.local/real-car-test/input-contact-sheet.jpg`. Tüm çevrenin aynı araç olduğunu görsel olarak doğruladık.

## Ölçülen sonuçlar

| Ayar | Süre | GLB boyutu | Üçgen | Renk dokusu |
| --- | ---: | ---: | ---: | ---: |
| reduced (uygulamanın mevcut mobil ayarı) | 100 sn | 5.451.032 bayt / 5,45 MB | 25.000 | 2048 × 2048 |
| medium (yerel karşılaştırma) | 108 sn | 17.592.620 bayt / 17,59 MB | 50.000 | 4096 × 4096 |

Süreler bu Mac'te ölçülen yerel üretim + GLB dönüşüm süreleridir; arama/indirme ve tarayıcı yükleme sürelerini içermez. Her iki işte kare atlama/geçersiz kare uyarısı 0; bu, her yüzeyin doğru veya eksiksiz olduğu anlamına gelmez. İki GLB de 20 MB sınırının altında kaldı ve doğrulamadan geçti.

Üretimde kullanılan Swift motorunun aynısı reduced için çalıştırıldı. Medium için yalnızca `.reduced` → `.medium` farkı olan geçici bir Swift kopyası derlendi; uygulamanın üretim ayarı değiştirilmedi. İki çıktıda da aynı `obj2gltf({binary:true,secure:true,unlit:true})` dönüşümü ve `validateModelFile` kullanıldı.

Çıktı SHA-256:

- reduced: `39ccd871310cfd9b18eaf8a8524eb6c04f446fe24e62de7b7d49f9396fb65efb`
- medium: `e951695ad25863057160f4ba4287fb84966e9eb9065f9cb61a79c67b87f18905`

## Chrome doğrulaması

Chrome otomatik dosya yüklemesi eklentinin dosya URL izni kapalı olduğu için kullanılamadı; normal sistem dosya seçicisi de seçimi tamamlamadı. Tarayıcı izinleri genişletilmedi. Testi tamamlamak için git dışında kalan yerel bir sayfa, **aynı MobileRuntime, BottomSheet ve src/Vehicle3D.tsx bileşenlerini** içe aktardı ve üretilen GLB'yi aynı localhost kaynağından yükledi. Ayrı bir hazır araç görüntüsü veya farklı renderer kullanılmadı.

- Yerel görünüm: `http://127.0.0.1:4173/.local/real-car-test/preview.html`.
- Ayrıntılı model: aynı URL'ye `?detail=medium` eklenir.
- GLB yükleme, döndürme, yakınlaştırma, ön/arka/yan/üst görünüm ve sıfırlama çalıştı.
- Döndürme gerçek kamera azimutunu değiştirdi: yaklaşık 0,728 → −2,413 radyan; arka gövde ve stoplar ayrı geometri/yüzey olarak görüldü.
- Kullanıcı modelinde demo hasar işaretleri görünmedi.
- Uygulama/WebGL kaynaklı hata veya uyarı görülmedi. Son kontrolde başka bir Chrome eklentisinin `chrome-extension://.../contentscript.js` kaynağından MaxListeners/ObjectMultiplex uyarıları vardı; bunlar uygulama konsolundan ayrı değerlendirildi ve eklenti ayarları değiştirilmedi. Kalibre iPhone ekranı 393 × 852 CSS px; 1400 × 1200 test görünümünde kaydedildi. Geçici viewport teslimden önce sıfırlandı.
- `npm run check:runtime`: 28 korumalı dosya geçti.

Bu test, gerçek rekonstrüksiyon motoru + dönüşüm + Chrome görüntüleme zincirini kapsar. Veri seti mevcut yönlendirmeli kamera akışıyla bizim uygulamamızda çekilmedi; kamera, otomatik yön doğrulaması ve 64 karelik asgari akışın her kullanıcıda yeterliliği bu deneyle kanıtlanmaz. Node API çoklu kullanıcı/uzak altyapı testi değildir.

## Görsel değerlendirme

Ön ızgara, marka işareti, gövde, far/stop düzeni ve genel araç silueti tanınabilir; tüm çevre döndürülebilir. Yan görünümde cam/yansıma birleşmeleri, kaporta yüzeyinde dalgalanma ve yumuşak jant ayrıntısı var. Araç çevresinde küçük bir zemin/kenar kalıntısı görülüyor.

Medium, telefon boyutundaki karşılaştırmada sınırlı görünür iyileşme sağladı; dosya yaklaşık 3,23 kat büyüdü. Bu sonuç, mevcut reduced ayarını hafif önizleme için korumayı destekliyor. Daha yüksek gerçekçilik için çekim ışığı, örtüşme, araç izolasyonu ve yüzey temizliği üzerinde çalışılmalı; salt ayrıntı artışı bu çekimdeki yansıma sorunlarını çözmedi.

Bu modellerden boya/değişen, ince çizik veya ölçü doğruluğu iddiası çıkarılmadı. Tek araç ve tek Mac sonucu bütün araçlara/telefonlara genellenemez.

## Yerel kanıt dosyaları

Tüm üçüncü taraf çekimler, üretilen modeller ve bunların ekran görüntüleri `.local/real-car-test/` altında ve git dışındadır; uygulamanın yayımlanan varlıklarına eklenmedi. Veri seti projesine yukarıda atıf verildi. Kod deposundaki Apache lisansı, veri seti için ayrıca doğrulanmış bir ticari dağıtım izni olarak varsayılmadı.

- `benchmark-summary.json`: iki çalışmanın ölçümleri.
- `test-result.json`, `test-result-medium.json`: girdi özetleri, gerçek zamanlar ve çıktı hash'leri.
- `volkswagen-reconstructed.glb`, `volkswagen-reconstructed-medium.glb`: motordan üretilen gerçek modeller.
- `chrome-front.png`, `chrome-rear.png`, `chrome-side.png`, `chrome-top.png`: mobil ayar.
- `chrome-medium-front.png`, `chrome-medium-rear.png`, `chrome-medium-side.png`: yüksek ayar.
- `quality-comparison.png`: eş boyutta yan görünüm karşılaştırması.

Teknik test: **passed**. Fotogerçekçi yüzey / ekspertiz doğruluğu: **kanıtlanmadı**.

## 29 Ekim kalite hattı ve branch ayrımı

Önceki reduced/medium sonuçları tarihsel karşılaştırmadır. Yeni deneyler ve kod `codex/vehicle-3d-lab` branch’inde saklanır; ana geliştirme fotoğraf yükleme akışıyla devam eder.

- Aynı 128 özgün kareyle full: 100.000 üçgen, 4K atlas, yaklaşık 6,06 MB mobil GLB.
- Custom (250k poligon / 8K üst sınırı): gerçek çıktı 142.968 üçgen, 4096×4096 atlas, 8.236.312 bayt. GLB SHA-256: `50f71b8c54223e4a80bfe977c6d37f012344b0de1fe0e02a5f5d17de57356ac6`. Daha büyük üst sınır kaynakta olmayan ayrıntıyı üretmedi.
- Kameralar/iç kalibrasyon/seyrek noktalar yalnızca fotoğraflardan tahmin edildi. Gerçek OBJ’nin her kameraya projeksiyonuyla araç alfa maskeleri üretildi. RGB ve kamera iç parametreleri birlikte ölçeklendi; kaynak JPEG’ler korunuyor.
- Maskeli Gaussian 4.000 adım: 411 sn, temizlik sonrası 171.023 nokta / 40.362.979 bayt. Aynı modelden 4.000 → 12.000 adım devamı: ek 800 sn, 173.133 nokta / 40.860.939 bayt. Bu bir sıfırdan 12k süre ölçümü değildir.
- Maskeleme zemin uzantılarını azalttı. Yan kaporta/cam hâlâ yumuşak ve bazı açılarda erimiş görünüyor; sonuç kusursuz veya ekspertiz için yeterli kabul edilmedi. Yoğun mesh kapı/cam sınırlarını daha belirgin koruyor; yansıma bozulması devam ediyor.
- Mevcut 128 kamerada en büyük çevre boşluğu 17,14°, yükseklik aralığı 27,48°. Çevre kapsamının iyi olması yüzey doğruluğunu kanıtlamaz.
- Yeni çekim planı normal/yüksek/alçak üç tur × sekiz yön × altı kare = 144; bu yeni planla gerçek araç çekimi henüz yapılmadı. Eski 64 kare taslak korunur, eksik çekimler tamamlanır. Yaklaşık %70+ örtüşme, sabit 1× lens ve dağınık ışık gerekir.
- 30 Node testi ve üretim derlemesi geçti. Native custom çıktı gerçek motorda, Gaussian ve mesh Chrome’da gerçek Vehicle3D bileşeniyle incelendi. HTTP testleri kontrollü motor kullanır. Fiziksel iOS/Android kamerası ve erimesiz yüzey doğruluğu doğrulanmadı.

Güncel modeller, `custom-result.json`, `masked-result.json`, `masked-refined-result.json` ve ekran kanıtları git dışındaki `.local/real-car-test/` içindedir. Üçüncü taraf fotoğraflar ve modeller branch’e eklenmedi.
