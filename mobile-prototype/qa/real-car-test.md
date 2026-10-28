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
