import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CalendarBlankIcon, CameraIcon, CaretDownIcon, CaretRightIcon, CarProfileIcon, CarSimpleIcon, CheckCircleIcon, CheckIcon, CubeIcon, EngineIcon, FileTextIcon, GasPumpIcon, GaugeIcon, GearIcon, HeartIcon, ImagesIcon, InfoIcon, MagnifyingGlassIcon, MapPinIcon, PlusIcon, BookmarkSimpleIcon, ShieldCheckIcon, SparkleIcon, TrashIcon, UserIcon, XIcon } from "@phosphor-icons/react";
import { BottomSheet, MobileScroll, useKeyboard, useKeyboardInsets, useMobileDevice, useScreenPortal } from "./mobile";
import { advertisementSpecs, demoListing, equipmentGroups, historySpecs, technicalSpecs, type EquipmentGroup } from "./listing-data";
import Marketplace, { type MarketplaceTab } from "./Marketplace";
import CaptureFlow, { useCaptureSession } from "./CaptureFlow";
import "@fontsource-variable/inter";

const Vehicle3D = lazy(() => import("./Vehicle3D"));
type Sheet = "finding" | "photos" | "sell" | "model" | "capture" | null;
type Photo = { id: string; url: string; name: string };
type Part = "door" | "hood";
const PHOTO_LIMIT = 8;

export default function Prototype() {
  const { device } = useMobileDevice();
  const { screenRef } = useScreenPortal();
  const { bottomInset } = useKeyboardInsets();
  const [sheet, setSheet] = useState<Sheet>(null);
  const captureSession = useCaptureSession();
  const [generatedModel, setGeneratedModel] = useState<{ name: string; buffer: ArrayBuffer; reconstructed: boolean }>();
  const [view, setView] = useState<"perspective" | "top">("perspective");
  const [part, setPart] = useState<Part>("door");
  const [findingFromModel, setFindingFromModel] = useState(false);
  const [favorite, setFavorite] = useState(() => {
    try { return localStorage.getItem("sattim-gitti-favorite-v1") === "true"; } catch { return false; }
  });
  const [favoriteStorageError, setFavoriteStorageError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem("sattim-gitti-favorite-v1", String(favorite)); setFavoriteStorageError(false); }
    catch { setFavoriteStorageError(true); }
  }, [favorite]);
  const keyboard = useKeyboard();
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("explore");
  const [listingOpen, setListingOpen] = useState(false);
  function navigate(tab: MarketplaceTab) { keyboard.hide(); setSheet(null); setListingOpen(false); setActiveTab(tab); }
  function openListing() { keyboard.hide(); setListingOpen(true); }

  const [equipment, setEquipment] = useState<EquipmentGroup>("Konfor");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());
  const busy = useRef(false);
  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    // Modal autofocus must scroll its own content, never the fixed device shell.
    const keepShellFixed = () => {
      if (screen.scrollTop || screen.scrollLeft) screen.scrollTo(0, 0);
    };
    keepShellFixed();
    screen.addEventListener("scroll", keepShellFixed);
    return () => screen.removeEventListener("scroll", keepShellFixed);
  }, [screenRef]);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || busy.current) return;
    busy.current = true;
    setReading(true);
    setError("");
    const accepted: Photo[] = [];
    const errors: string[] = [];
    try {
      for (const file of files) {
        if (photos.length + accepted.length >= PHOTO_LIMIT) {
          errors.push("En fazla 8 fotoğraf ekleyebilirsin.");
          break;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          errors.push("JPG, PNG veya WebP fotoğraf seç.");
          continue;
        }
        if (file.size > 12 * 1024 * 1024) {
          errors.push("Her fotoğraf en fazla 12 MB olabilir.");
          continue;
        }
        try {
          const bitmap = await createImageBitmap(file);
          bitmap.close();
          const url = URL.createObjectURL(file);
          objectUrls.current.add(url);
          accepted.push({ id: crypto.randomUUID(), url, name: file.name });
        } catch {
          errors.push("Bir fotoğraf açılamadı. Başka bir dosya dene.");
        }
      }
      setPhotos((previous) => [...previous, ...accepted]);
      setError([...new Set(errors)].join(" "));
    } finally {
      busy.current = false;
      setReading(false);
    }
  }

  function removePhoto(photo: Photo) {
    URL.revokeObjectURL(photo.url);
    objectUrls.current.delete(photo.url);
    setPhotos((previous) => previous.filter((item) => item.id !== photo.id));
    setError("");
  }

  const partName = part === "door" ? "Sol ön kapı" : "Kaput";
  function openFinding(selected: Part, fromModel = false) {
    setPart(selected);
    setFindingFromModel(fromModel);
    setSheet("finding");
  }
  const titles: Record<Exclude<Sheet, null>, string> = {
    finding: partName, photos: "Fotoğrafların", sell: "Aracını satmaya başla.", model: "3D inceleme", capture: "Aracını tara",
  };

  return (
    <div className={`vehicle-app ${listingOpen ? "listing-page" : "market-page"}`} style={{ "--app-safe-top": `${device.geometry.safeArea.top}px`, "--app-safe-bottom": `${device.platform === "android" ? 0 : device.geometry.safeArea.bottom}px`, "--app-bottom": `${bottomInset}px` } as CSSProperties} onPointerDownCapture={(event) => {
      // A blur must not move keyboard-attached buttons between pointer-down and click.
      if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) event.preventDefault();
    }}>
      <header className="app-header">
        {listingOpen && <button className="icon-button" aria-label="Geri dön" onClick={() => { keyboard.hide(); setListingOpen(false); }}><ArrowLeftIcon size={24} weight="light" /></button>}
        <span className="wordmark">Sattım Gitti<span className="brand-dot">.</span></span>
        <div className="header-actions">{listingOpen && <button className="icon-button" aria-label={favorite ? "Favorilerden çıkar" : "Favorilere ekle"} aria-pressed={favorite} onClick={() => setFavorite(!favorite)}><HeartIcon size={25} weight={favorite ? "fill" : "light"} /></button>}<button className="sell-entry" onClick={() => setSheet("sell")}><PlusIcon size={17} /><span>Araç sat</span></button></div>
      </header>
      <Marketplace activeTab={listingOpen ? "listing" : activeTab} favorite={favorite} onFavorite={() => setFavorite(!favorite)} onListing={openListing} onNavigate={navigate} onCapture={() => setSheet("capture")} onPhotos={() => setSheet("photos")} photoCount={photos.length} scanCount={captureSession.photos.length} />
      {listingOpen && <MobileScroll className="vehicle-scroll">
        <main className="vehicle-content">
          <div className="intro listing-intro">
            <span className="eyebrow">ÖRNEK İLAN</span>
            <h1>{demoListing.name}</h1>
            <p>{demoListing.version}</p>
            <div className="listing-price"><strong>{demoListing.price} <span>₺</span></strong><span className="listing-location"><MapPinIcon size={14} weight="light" />{demoListing.location}</span></div>
          </div>
          <div className={`car-stage ${view === "top" ? "is-top" : ""}`}>
            <img className="hero-car" src={view === "top" ? "/assets/car-top.png" : "/assets/car-front.png"} alt={view === "top" ? "Örnek gümüş SUV, üstten görünüm" : "Örnek gümüş SUV, ön çapraz görünüm"} draggable={false} />
            <button className={`panel-hotspot door-hotspot ${part === "door" ? "is-selected" : ""}`} aria-label="Sol ön kapı: örnek çizik bulgusunu incele" onClick={() => openFinding("door")}><span className="hotspot-dot" /></button>
            {view === "top" && <button className="panel-hotspot hood-hotspot" aria-label="Kaput: incelenmedi" onClick={() => openFinding("hood")}><InfoIcon size={18} /></button>}
          </div>
          <div className="view-toolbar">
            <button className="open-model-button" onClick={() => setSheet("model")} aria-label="Gerçek 3D görüntüleyiciyi aç"><CubeIcon size={19} weight="light" /><span>3D</span></button>
            <span className="view-hint"><CarProfileIcon size={23} weight="light" /><span>{view === "top" ? "Parçaya dokun" : "Örnek araç"}</span></span>
            <div className="view-switch" role="group" aria-label="Araç görünümü">
              <button className={view === "perspective" ? "active" : ""} aria-label="Çapraz görünüm" aria-pressed={view === "perspective"} onClick={() => setView("perspective")}><CubeIcon size={24} weight={view === "perspective" ? "fill" : "light"} /></button>
              <button className={view === "top" ? "active" : ""} aria-label="Üstten görünüm" aria-pressed={view === "top"} onClick={() => setView("top")}><CarSimpleIcon size={25} weight="light" /></button>
            </div>
          </div>
          <dl className="quick-facts" aria-label="Temel araç özellikleri">
            <div><CalendarBlankIcon size={23} weight="light" /><dt>Model yılı</dt><dd>{demoListing.year}</dd></div>
            <div><GaugeIcon size={23} weight="light" /><dt>Kilometre</dt><dd>{demoListing.mileage} <small>km</small></dd></div>
            <div><GearIcon size={23} weight="light" /><dt>Vites</dt><dd>{demoListing.transmission}</dd></div>
            <div><GasPumpIcon size={23} weight="light" /><dt>Yakıt</dt><dd>{demoListing.fuel}</dd></div>
          </dl>
          <button className="finding-row" onClick={() => openFinding(part)}>
            <span className={`finding-icon ${part === "hood" ? "unknown" : ""}`}><CarProfileIcon size={30} weight="light" /></span>
            <span className="finding-copy"><strong>{part === "door" ? "Olası çizik" : "İncelenmedi"}</strong><span>{partName}</span><small>{part === "door" ? "Örnek bulgu · Doğrulanmadı" : "Bu açı için fotoğraf ekle"}</small></span>
            <CaretRightIcon size={22} weight="light" />
          </button>
          {photos.length > 0 && <button className="photo-summary" onClick={() => setSheet("photos")}><ImagesIcon size={20} /><span>{photos.length} fotoğraf eklendi</span><span className="muted">Analiz bekliyor</span><CaretRightIcon size={16} /></button>}
          <section className="listing-information" aria-labelledby="listing-information-title">
            <div className="information-heading"><h2 id="listing-information-title">Her ayrıntısı burada.</h2><span>Örnek ilan bilgileri</span></div>
            <details className="information-section" data-testid="technical-section">
              <summary><EngineIcon size={25} weight="light" /><span><strong>Motor & teknik</strong><small>150 HP · 1.332 cm³ · Önden çekiş</small></span><CaretDownIcon size={18} /></summary>
              <div className="information-body"><dl className="specification-list">{technicalSpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="data-source">Motor verileri: 2021 model katalog bilgisi. Araca ait bilgiler örnektir.</p></div>
            </details>
            <details className="information-section" data-testid="equipment-section">
              <summary><SparkleIcon size={25} weight="light" /><span><strong>Donanım</strong><small>Konfor, güvenlik ve teknoloji</small></span><CaretDownIcon size={18} /></summary>
              <div className="information-body">
                <div className="equipment-switch" role="group" aria-label="Donanım kategorisi">{(Object.keys(equipmentGroups) as EquipmentGroup[]).map((group) => <button key={group} className={equipment === group ? "active" : ""} aria-pressed={equipment === group} onClick={() => setEquipment(group)}>{group}</button>)}</div>
                <ul className="equipment-list" aria-label={`${equipment} donanımları`}>{equipmentGroups[equipment].map((feature) => <li key={feature}><CheckIcon size={15} /><span>{feature}</span></li>)}</ul>
                <p className="data-source">Örnek satıcı beyanı. Bu araca takılı donanımlar ayrıca doğrulanmalıdır.</p>
              </div>
            </details>
            <details className="information-section" data-testid="history-section">
              <summary><ShieldCheckIcon size={25} weight="light" /><span><strong>Ekspertiz & geçmiş</strong><small>Belge ve beyanı ayrı gör</small></span><CaretDownIcon size={18} /></summary>
              <div className="information-body"><dl className="specification-list history-list">{historySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="source-note"><InfoIcon size={19} /><p>Eksik bilgi, hasarsız anlamına gelmez. Fotoğraf bulguları boya veya değişen raporu yerine geçmez.</p></div><button className="secondary-button" onClick={() => openFinding("door")}>Örnek bulguyu incele<CaretRightIcon size={17} /></button></div>
            </details>
            <details className="information-section" data-testid="advertisement-section">
              <summary><FileTextIcon size={25} weight="light" /><span><strong>İlan & satıcı</strong><small>Açıklama ve satış bilgileri</small></span><CaretDownIcon size={18} /></summary>
              <div className="information-body"><div className="listing-seller"><span className="seller-avatar"><UserIcon size={23} weight="light" /></span><div><strong>Bireysel satıcı</strong><span>{demoListing.location}</span></div><small>Örnek profil</small></div><dl className="specification-list">{advertisementSpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3 className="description-title">Satıcının notu</h3><p className="seller-description">Aracımı model yükseltmek için satıyorum. Kullanılmadığı zaman kapalı otoparkta tutuldu. İncelemek isteyenler kendi ekspertizini yaptırabilir.</p><p className="data-source">Fiyat, kilometre, donanım ve satıcı açıklaması tasarım için hazırlanmış örnek verilerdir. Canlı bir satış ilanı değildir.</p></div>
            </details>
          </section>
        </main>
      </MobileScroll>}
      <footer className="app-footer">
        {listingOpen && <button className="primary-button" onClick={() => setSheet("capture")}><CameraIcon size={25} weight="light" /><span>{captureSession.photos.length ? "Taramaya devam et" : "Aracını tara"}</span></button>}
        <nav className="bottom-nav" aria-label="Ana gezinme">
          {([{ id: "explore", label: "Keşfet", Icon: MagnifyingGlassIcon }, { id: "tracking", label: "Takip", Icon: BookmarkSimpleIcon }, { id: "favorites", label: "Favoriler", Icon: HeartIcon }, { id: "account", label: "Hesabım", Icon: UserIcon }] as const).map(({ id, label, Icon }) => <button key={id} className={(activeTab === id) ? "selected" : ""} aria-current={(activeTab === id) ? "page" : undefined} onClick={() => navigate(id)}><Icon size={25} weight={(activeTab === id) ? "fill" : "light"} /><span>{label}</span></button>)}
        </nav>
        {favoriteStorageError && <span className="favorite-storage-error" role="status">Favorin yalnızca bu oturumda saklanıyor.</span>}
      </footer>
      <input ref={fileInput} className="file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple tabIndex={-1} aria-label="Araç fotoğraflarını seç" onChange={addPhotos} disabled={reading} />
      <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheet ? titles[sheet] : ""} description={sheet === "capture" ? "Kendi aracından gerçek bir 3D model." : sheet === "photos" ? "Aracın farklı açılarını ekle." : sheet === "finding" ? "Örnek araç üzerindeki parça bilgisi." : sheet === "model" ? "Döndür, yakınlaş, parçaları keşfet." : "Fotoğraflarınla ilk adımı at."} snap={sheet === "capture" || sheet === "model" ? 0.92 : sheet === "photos" ? 0.82 : 0.73}>
        <button className="sheet-close icon-button" aria-label="Paneli kapat" onClick={() => setSheet(null)}><XIcon size={20} /></button>
        {sheet === "capture" && <CaptureFlow session={captureSession} onModel={(buffer) => { setGeneratedModel({ name: "Aracının 3D modeli", buffer, reconstructed: true }); setSheet("model"); }} />}
        {sheet === "model" && <Suspense fallback={<div className="model-loading" role="status">3D görüntüleyici açılıyor…</div>}><Vehicle3D initialModel={generatedModel} onPartSelect={(selected) => openFinding(selected, true)} /></Suspense>}
        {sheet === "finding" && <div className="detail-content">
          <span className={`status-label ${part === "hood" ? "neutral" : ""}`}>{part === "door" ? "Olası çizik" : "İncelenmedi"}</span>
          {part === "door" ? <><img className="evidence-photo" src="/assets/sample-scratch.png" alt="Örnek görsel: gümüş kapıda ince yüzey çizikleri" /><div className="evidence-caption"><span>Örnek fotoğraf</span><span>Doğrulanmadı</span></div><p>Bu bulgu deneyimi göstermek için hazırlanmış örnektir. Yüklediğin fotoğrafların analiz sonucu değildir.</p></> : <div className="empty-panel"><CameraIcon size={42} weight="light" /><p>Kaput için henüz bir bulgu yok. Görülmeyen parçalar hasarsız kabul edilmez.</p></div>}
          <div className="source-note"><InfoIcon size={20} /><p>Boya ve değişen bilgisi için ekspertiz raporu veya kaynağı belirtilen satıcı beyanı gerekir.</p></div>
          {findingFromModel && <button className="primary-button" onClick={() => setSheet("model")}><CubeIcon size={22} />3D modele dön</button>}
          <button className={findingFromModel ? "secondary-button" : "primary-button"} onClick={() => setSheet("photos")}><CameraIcon size={22} />Kendi fotoğrafını ekle</button>
        </div>}
        {sheet === "photos" && <div className="upload-content">
          <div className="capture-guide"><CarSimpleIcon size={38} weight="light" /><div><strong>Her açıdan, gün ışığında.</strong><p>Ön, arka ve iki yan. İz gördüğün yere yaklaş.</p></div></div>
          {photos.length ? <div className="photo-grid">{photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={`Eklenen fotoğraf: ${photo.name}`} /><button className="remove-photo" aria-label={`${photo.name} fotoğrafını kaldır`} disabled={reading} onClick={() => removePhoto(photo)}><TrashIcon size={17} /></button><figcaption>Analiz bekliyor</figcaption></figure>)}</div> : <button className="upload-target" onClick={() => fileInput.current?.click()} disabled={reading}><ImagesIcon size={38} weight="light" /><strong>Fotoğraflarını seç</strong><span>JPG, PNG, WebP · En fazla 8 fotoğraf</span></button>}
          {error && <p className="upload-error" role="alert">{error}</p>}
          <p className="upload-status" role="status">{reading ? "Fotoğraflar açılıyor…" : photos.length ? `${photos.length} / 8 fotoğraf · Bu oturumda cihazında tutulur.` : "Fotoğraflar sunucuya gönderilmez."}</p>
          <div className="source-note"><InfoIcon size={20} /><p>Bu fotoğraflar hasar analizi üretmez. 3D model için yönlendirmeli taramadaki iki çekim turunu tamamla.</p></div>
          <button className="secondary-button" onClick={() => setSheet("capture")}><CubeIcon size={22} />3D araç taramasına geç</button>
          <button className="primary-button" disabled={reading || photos.length >= PHOTO_LIMIT} onClick={() => fileInput.current?.click()}><CameraIcon size={22} />{reading ? "Açılıyor…" : photos.length ? "Başka fotoğraf ekle" : "Galeriden seç"}</button>
          {photos.length > 0 && <button className="secondary-button" onClick={() => setSheet(null)}><CheckCircleIcon size={20} />Araca dön</button>}
        </div>}
        {sheet === "sell" && <div className="sell-content"><div className="sell-intro"><CameraIcon size={34} weight="light" /><h2>Aracınla başlayalım.</h2><p>Fotoğraflarını ekle veya yönlendirmeli çekimle aracının 3D modelini oluştur.</p></div><button className="primary-button" onClick={() => setSheet("capture")}><CameraIcon size={22} />{captureSession.photos.length ? "Taramaya devam et" : "Aracını tara"}<ArrowRightIcon size={21} /></button><button className="secondary-button" onClick={() => setSheet("photos")}><ImagesIcon size={22} />İlan fotoğraflarını ekle</button><p className="market-data-note">Bu prototipte fotoğraf hazırlayabilirsin. İlan yayınlama ve satıcı iletişimi henüz bağlı değil.</p></div>}
      </BottomSheet>
    </div>
  );
}
