import { PhotoCamera } from "./PhotoCamera";
import { lazy, Suspense, useMemo, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { ArrowLeftIcon, ArrowRightIcon, CalendarBlankIcon, CameraIcon, ChartLineIcon, CaretDownIcon, CaretRightIcon, CarSimpleIcon, CheckCircleIcon, CheckIcon, EngineIcon, FileTextIcon, GasPumpIcon, GaugeIcon, GearIcon, HeartIcon, ImagesIcon, InfoIcon, MagnifyingGlassIcon, MapPinIcon, PlusIcon, BookmarkSimpleIcon, ScalesIcon, ShieldCheckIcon, SparkleIcon, TrashIcon, UserIcon, WalletIcon, XIcon } from "@phosphor-icons/react";
import { BottomSheet, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard, useKeyboardInsets, useMobileDevice, useScreenPortal } from "./mobile";
import { advertisementSpecs, demoListing, equipmentGroups, historySpecs, technicalSpecs, type EquipmentGroup } from "./listing-data";
import { comparisonVehicle, estimateUsageCost, exampleVehicle, money, usageAssumptions, type DecisionTab } from "./decision-data";
import Marketplace, { type MarketplaceTab } from "./Marketplace";
import CloudMarketplace from "./CloudMarketplace";
import { journeySteps, journeyProgress, journeyStorageKey, parseJourneyState, normalizeChecks, toggleJourneyCheck, validAppointment, type JourneyDraft, type JourneyRole, type JourneyState } from "./sales-journey";
import { photoRegions } from "./photo-guide";
import VehicleTour from "./VehicleTour";
import CaptureFlow, { useCaptureSession } from "./CaptureFlow";
import "@fontsource-variable/inter";

const Vehicle3D = lazy(() => import("./Vehicle3D"));

type Sheet = "photos" | "sell" | "decision" | "capture" | "tour" | "model" | null;
type Photo = { id: string; url: string; name: string; region: number };
const PHOTO_LIMIT = 8;

type DecisionSupportProps = { initialTab: DecisionTab; favorite: boolean; onFollowPrice: () => void };
function DecisionSupport({ initialTab, favorite, onFollowPrice }: DecisionSupportProps) {
  const [tab, setTab] = useState(initialTab);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [monthlyKm, setMonthlyKm] = useState(String(usageAssumptions.monthlyKm));
  const [fuelPrice, setFuelPrice] = useState(String(usageAssumptions.fuelPrice));
  const [maintenance, setMaintenance] = useState(String(exampleVehicle.monthlyMaintenance));
  const keyboard = useKeyboard();
  const { availableHeight } = useKeyboardInsets();
  const { device } = useMobileDevice();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.closest(".sheet-content")?.scrollTo(0, 0); }, [tab]);
  useEffect(() => {
    // Keep this app's form below device chrome when the keyboard reduces usable space.
    const sheet = root.current?.closest<HTMLElement>(".bottom-sheet");
    const height = Math.max(260, Math.min(Math.round(device.geometry.screen.height * .92), availableHeight - device.geometry.safeArea.top - 12));
    sheet?.style.setProperty("--decision-height-cap", `${height}px`);
    return () => { sheet?.style.removeProperty("--decision-height-cap"); };
  }, [availableHeight, device]);
  const parse = (value: string) => value.trim() === "" ? NaN : Number(value.replace(",", "."));
  const cost = estimateUsageCost(exampleVehicle, parse(monthlyKm), parse(fuelPrice), parse(maintenance));
  const exampleCost = estimateUsageCost(exampleVehicle, usageAssumptions.monthlyKm, usageAssumptions.fuelPrice)!;
  const alternativeCost = estimateUsageCost(comparisonVehicle, usageAssumptions.monthlyKm, usageAssumptions.fuelPrice)!;
  const rows = [
    ["İlan / senaryo fiyatı", money(exampleVehicle.price), money(comparisonVehicle.price)],
    ["Koltuk", String(exampleVehicle.seats), String(comparisonVehicle.seats)],
    ["Bagaj", `${exampleVehicle.luggage} L`, `${comparisonVehicle.luggage} L`],
    ["Tüketim", `${exampleVehicle.consumption.toLocaleString("tr")} L/100 km`, `${comparisonVehicle.consumption.toLocaleString("tr")} L/100 km`],
    ["Aylık yakıt + bakım", money(exampleCost.total), money(alternativeCost.total)],
    ["Vites", exampleVehicle.transmission, comparisonVehicle.transmission],
  ];
  function switchTab(next: DecisionTab) {
    // Preserve an in-dialog focus target before removing a keyboard-focused input.
    root.current?.querySelector<HTMLButtonElement>(`[data-decision-tab="${next}"]`)?.focus({ preventScroll: true });
    keyboard.hide();
    setTab(next);
  }
  return <div className="decision-support" ref={root} onPointerDownCapture={(event) => {
    if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) event.preventDefault();
  }}>
    <div className="decision-tabs" role="group" aria-label="Karar araçları">{([{ id: "compare", label: "Karşılaştır", Icon: ScalesIcon }, { id: "price", label: "Fiyat bilgisi", Icon: ChartLineIcon }, { id: "cost", label: "Kullanım", Icon: WalletIcon }] as const).map(({ id, label, Icon }) => <button key={id} data-decision-tab={id} aria-pressed={tab === id} onClick={() => switchTab(id)}><Icon size={20} weight="light" />{label}</button>)}</div>
    {tab === "compare" && <>
      <div className="decision-intro"><span className="eyebrow">ÖRNEK KARŞILAŞTIRMA</span><h2>Farkları yan yana gör.</h2><p>Mevcut örnek ilanı, kurgusal bir station wagon senaryosuyla karşılaştır.</p></div>
      <div className="decision-note"><InfoIcon size={18} /><p>Bagaj, tüketim ve bakım tutarları tasarım için kurgulandı. Jeep'in doğrulanmış teknik verisi veya gerçek bir ikinci ilan değildir.</p></div>
      <label className="differences-toggle"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />Sadece farkları göster</label>
      <div className="decision-table-wrap"><table className="decision-table"><caption className="sr-only">İki örnek araç senaryosunun karşılaştırması</caption><thead><tr><th scope="col">Özellik</th><th scope="col">{exampleVehicle.name}<small>Örnek ilan</small></th><th scope="col">Station wagon<small>Kurgusal senaryo</small></th></tr></thead><tbody>{rows.filter(([, a, b]) => !differencesOnly || a !== b).map(([label, a, b]) => <tr key={label}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div>
      <p className="decision-footnote">Aylık maliyet: {usageAssumptions.monthlyKm.toLocaleString("tr")} km, {usageAssumptions.fuelPrice} ₺/L yakıt ve her araç için 1.000 ₺ bakım varsayımı. Vergi, sigorta ve değer kaybı dahil değil.</p>
      <button className="secondary-button" onClick={() => switchTab("cost")}>Kendi kullanımını hesapla<ArrowRightIcon size={18} /></button>
    </>}
    {tab === "price" && <>
      <div className="decision-intro"><span className="eyebrow">ÖRNEK İLAN FİYATI</span><h2>{money(exampleVehicle.price)}</h2><p>Bir fiyatı anlamak için geçmişini ve benzerlerini birlikte görmek gerekir.</p></div>
      <section className="price-evidence"><ChartLineIcon size={25} weight="light" /><div><h3>Fiyat geçmişi</h3><strong>Henüz kayıt yok</strong><p>Bu örnek ilanda önceki fiyatlar bulunmuyor. Değişim grafiği oluşturulamıyor.</p></div></section>
      <section className="price-evidence"><ScalesIcon size={25} weight="light" /><div><h3>Piyasa ile karşılaştırma</h3><strong>Değerlendirme için veri eksik</strong><p>Aynı model, yıl, kilometre, donanım ve kondisyonla eşleşen canlı ilanlar gerekiyor. Bu araç için “ucuz” veya “pahalı” sonucu üretilmedi.</p></div></section>
      <div className="decision-note"><InfoIcon size={18} /><p>İlan fiyatı satış fiyatı değildir. Canlı ilan ve fiyat geçmişi kaynağı henüz bağlı değil.</p></div>
      <button className="primary-button" onClick={onFollowPrice}>{favorite ? "Kaydedilenler’de fiyat bilgisine git" : "Favoriye ekle, Kaydedilenler’de gör"}<ArrowRightIcon size={19} /></button>
    </>}
    {tab === "cost" && <>
      <div className="decision-intro"><span className="eyebrow">YAKIT + BAKIM HESABI</span><h2>Kullanırken ne tutar?</h2><p>Kendi varsayımlarınla örnek aylık bütçeyi gör.</p></div>
      <div className="decision-note"><InfoIcon size={18} /><p>Hesapta 7,5 L/100 km örnek tüketim kullanılır. Bu, aracın ölçülmüş tüketimi veya güncel yakıt fiyatı değildir.</p></div>
      <div className="cost-inputs">{[{ label: "Aylık mesafe (km)", value: monthlyKm, set: setMonthlyKm }, { label: "Yakıt fiyatı (₺/L)", value: fuelPrice, set: setFuelPrice }, { label: "Aylık bakım bütçesi (₺)", value: maintenance, set: setMaintenance }].map(({ label, value, set }) => <label key={label}><span>{label}</span><KeyboardInput aria-label={label} inputMode="decimal" value={value} onChange={(event) => set(event.target.value)} onBlur={() => keyboard.hide()} /></label>)}</div>
      <button className="primary-button" disabled={!cost} onClick={() => { keyboard.hide(); root.current?.querySelector<HTMLElement>(".cost-result")?.focus(); }}>Bütçeyi gör<ArrowRightIcon size={19} /></button>
      <div className="cost-result" tabIndex={-1} aria-live="polite">{cost ? <><span>Aylık örnek bütçe</span><strong>{money(cost.total)}</strong><dl><div><dt>Yakıt</dt><dd>{money(cost.fuel)}</dd></div><div><dt>Bakım payı</dt><dd>{money(cost.maintenance)}</dd></div></dl></> : <p role="status">Hesaplamak için her alana sıfır veya daha büyük geçerli bir sayı gir.</p>}</div>
      <p className="decision-footnote">Vergi, sigorta, finansman, otopark ve değer kaybı dahil değil. Hesap, girilen varsayımlara göre değişir.</p>
    </>}
  </div>;
}

function SalesJourney({ state, onChange, storageError }: { state: JourneyState; onChange: (next: JourneyState) => void; storageError: boolean }) {
  const keyboard = useKeyboard();
  const role = state.role;
  const current = state[role];
  const progress = journeyProgress(current);
  const [selected, setSelected] = useState(progress.next?.id ?? "handover");
  const [fields, setFields] = useState(current);
  const [status, setStatus] = useState("");
  const step = journeySteps.find((item) => item.id === selected) ?? journeySteps[0];
  const Icons = [UserIcon, CalendarBlankIcon, ShieldCheckIcon, WalletIcon, ShieldCheckIcon, FileTextIcon, WalletIcon, FileTextIcon, CarSimpleIcon];
  function openStep(id: string) {
    keyboard.hide(); setSelected(id); setStatus("");
    requestAnimationFrame(() => document.getElementById(`journey-step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function updateField(key: keyof Omit<JourneyDraft, "completed">, value: string) {
    setFields((previous) => ({ ...previous, [key]: value })); setStatus("");
  }
  function save(keys: (keyof Omit<JourneyDraft, "completed">)[], message: string) {
    keyboard.hide();
    if (selected === "appointment" && !validAppointment(fields.date, fields.time, fields.place)) {
      setStatus("Geçerli bir tarih (GG.AA.YYYY), saat (SS:DD) ve buluşma yeri gir."); return;
    }
    if (selected === "offer" && (!/^\d{1,9}$/.test(fields.offer) || Number(fields.offer) <= 0)) {
      setStatus("Teklifini 1 ile 999.999.999 ₺ arasında, yalnızca rakamlarla gir."); return;
    }
    if ((selected === "contact" && !fields.message.trim()) || (selected === "expertise" && !fields.expertise.trim())) {
      setStatus("Kaydetmeden önce bir not yaz."); return;
    }
    const next = { ...current };
    for (const key of keys) next[key] = fields[key].trim();
    // A changed price invalidates the old payment preparation and downstream confirmations.
    if (keys.includes("offer") && next.offer !== current.offer) next.completed = normalizeChecks(next.completed.filter((id) => id !== "offer" && id !== "payment-details"));
    if (keys.includes("date") && (next.date !== current.date || next.time !== current.time || next.place !== current.place)) next.completed = next.completed.filter((id) => id !== "appointment");
    onChange({ ...state, [role]: next }); setStatus(message);
  }
  const renderFields = () => <>
    {selected === "contact" && <form className="journey-form" onSubmit={(event) => { event.preventDefault(); save(["message"], "Mesaj taslağın kaydedildi. Karşı tarafa gönderilmedi."); }}>
      <label>Mesaj / görüşme notu<KeyboardTextarea aria-label="Mesaj taslağı" placeholder={role === "buyer" ? "Merhaba, bakım kayıtlarını görebilir miyim? Aracı ne zaman inceleyebilirim?" : "Alıcının soruları ve paylaşacağım araç bilgileri…"} value={fields.message} maxLength={1200} onChange={(event) => updateField("message", event.target.value)} onBlur={() => keyboard.hide()} /></label>
      <button className="secondary-button" type="submit">Mesaj taslağını kaydet</button><small>Mesajlaşma servisi bağlı değil. Taslak yalnızca bu tarayıcıda tutulur.</small>
    </form>}
    {selected === "appointment" && <form className="journey-form" onSubmit={(event) => { event.preventDefault(); save(["date", "time", "place"], "Randevu planın kaydedildi. Karşı tarafa davet veya bildirim gönderilmedi."); }}>
      <div className="journey-form-pair"><label>Tarih<KeyboardInput aria-label="Randevu tarihi" placeholder="GG.AA.YYYY" value={fields.date} maxLength={10} onChange={(event) => updateField("date", event.target.value)} onBlur={() => keyboard.hide()} /></label><label>Saat<KeyboardInput aria-label="Randevu saati" placeholder="14:30" value={fields.time} maxLength={5} onChange={(event) => updateField("time", event.target.value)} onBlur={() => keyboard.hide()} /></label></div>
      <label>Buluşma yeri<KeyboardInput aria-label="Buluşma yeri" placeholder="Örn. ekspertiz merkezinin adresi" value={fields.place} maxLength={160} onChange={(event) => updateField("place", event.target.value)} onBlur={() => keyboard.hide()} /></label>
      <button className="secondary-button" type="submit">Randevu planını kaydet</button><small>Bu bir kişisel plan; rezervasyon veya hatırlatma oluşturmaz.</small>
    </form>}
    {selected === "expertise" && <form className="journey-form" onSubmit={(event) => { event.preventDefault(); save(["expertise"], "Ekspertiz notun kaydedildi. Rapor doğrulaması yapılmadı."); }}>
      <label>Rapor / kontrol notu<KeyboardTextarea aria-label="Ekspertiz notu" placeholder="Merkez, rapor tarihi ve tekrar soracağın konular…" value={fields.expertise} maxLength={1200} onChange={(event) => updateField("expertise", event.target.value)} onBlur={() => keyboard.hide()} /></label><button className="secondary-button" type="submit">Ekspertiz notunu kaydet</button><small>Ekspertiz rezervasyonu veya otomatik rapor doğrulaması yapılmaz.</small>
    </form>}
    {selected === "offer" && <form className="journey-form" onSubmit={(event) => { event.preventDefault(); save(["offer"], "Fiyat teklifi taslağın kaydedildi. Gönderilmedi veya kabul edilmedi."); }}>
      <label>Teklif tutarı (₺)<KeyboardInput aria-label="Teklif tutarı" inputMode="numeric" placeholder="Örn. 1650000" value={fields.offer} maxLength={9} onChange={(event) => updateField("offer", event.target.value)} onBlur={() => keyboard.hide()} /></label>
      {current.offer && <div className="journey-offer"><span>Kayıtlı taslağın</span><strong>{money(Number(current.offer))}</strong><small>Karşı tarafın kabulü henüz kaydedilmedi.</small></div>}
      <button className="secondary-button" type="submit">Teklif taslağını kaydet</button><small>Tutar değişirse eski ödeme ve noter teyitleri yeniden açılır.</small>
    </form>}
    {selected === "insurance" && <div className="journey-service"><ShieldCheckIcon size={23} weight="light" /><p>Sigortacın veya yetkili acenten üzerinden poliçeni hazırlat. Uygulama poliçe düzenlemez, prim tahsil etmez.</p></div>}
    {selected === "tax" && <a className="secondary-button journey-external" href="https://dijital.gib.gov.tr/" target="_blank" rel="noreferrer">GİB'de MTV sorgula / öde<ArrowRightIcon size={18} /></a>}
    {selected === "payment" && <div className="journey-service"><WalletIcon size={23} weight="light" /><p>Bu uygulama para almaz veya bloke etmez. Bankanın ya da yetkili kuruluşun resmî güvenli ödeme ekranından ilerle; buradaki işaretler ödeme kanıtı değildir.</p></div>}
  </>;
  return <MobileScroll className="market-scroll journey-scroll"><main className="market-content journey-content">
    <div className="market-heading journey-heading"><span className="eyebrow">İLANDAN TESLİMATA</span><h1>Her adımda<br />yanındayız.</h1><p>Görüş, planla, kontrol et.<br />Alım-satım sürecin tek yerde.</p></div>
    <div className="journey-role" role="group" aria-label="Süreçteki rolün">{([{ id: "buyer", label: "Araç alıyorum" }, { id: "seller", label: "Araç satıyorum" }] as const).map(({ id, label }) => <button key={id} aria-pressed={role === id} onClick={() => { keyboard.hide(); onChange({ ...state, role: id }); }}>{label}</button>)}</div>
    <div className="journey-vehicle"><img src="/assets/car-front.png" alt="Örnek Jeep Compass" draggable={false} /><span><small>ÖRNEK SÜREÇ · {role === "buyer" ? "ALICI" : "SATICI"}</small><strong>{demoListing.name}</strong><small>{demoListing.year} · {demoListing.price} ₺</small></span></div>
    <section className="journey-progress" aria-label="Süreç ilerlemesi"><div><strong>{progress.done} / {progress.total}</strong><span>adım tamamlandı</span></div><progress aria-label="Tamamlanan adımlar" value={progress.done} max={progress.total} /><small>İlerleme kendi işaretlemelerine dayanır; resmî doğrulama değildir.</small></section>
    {storageError && <p className="upload-error" role="alert">Tarayıcıya kaydedilemiyor. İlerlemen yalnızca bu oturumda tutuluyor.</p>}
    <section className="journey-next"><span className="eyebrow">{progress.next ? "SIRADAKİ ADIMIN" : "KONTROL LİSTEN TAMAMLANDI"}</span><h2>{progress.next?.title ?? "Son kontroller de tamam."}</h2><p>{progress.next?.subtitle ?? "İşaretlerin kaydedildi. Resmî işlem durumunu ilgili kuruluşlardan teyit et."}</p>{progress.next && <button className="primary-button" onClick={() => openStep(progress.next!.id)}>Bu adıma geç<ArrowRightIcon size={19} /></button>}</section>
    <div className="journey-section-heading"><h2>Yol haritan</h2><span>{journeySteps.length} adım</span></div>
    <div className="journey-timeline">{journeySteps.map((item, index) => {
      const done = item.checks.every((check) => current.completed.includes(check.id));
      const Icon = Icons[index];
      return <section className={`journey-step ${selected === item.id ? "is-open" : ""} ${done ? "is-done" : ""}`} id={`journey-step-${item.id}`} key={item.id}>
        <button className="journey-step-toggle" aria-expanded={selected === item.id} aria-controls={`journey-detail-${item.id}`} onClick={() => { keyboard.hide(); setSelected(selected === item.id ? "" : item.id); setStatus(""); }}>
          <span className="journey-step-icon">{done ? <CheckIcon size={20} /> : <Icon size={22} weight="light" />}</span><span><strong>{index + 1}. {item.title}</strong><small>{done ? "İşaretledin · Kendi beyanın" : item.subtitle}</small></span><CaretDownIcon size={17} />
        </button>
        {selected === item.id && <section className="journey-step-detail" id={`journey-detail-${item.id}`}><p>{step[role]}</p>{renderFields()}
          {status && <p className="journey-status" role="status">{status}</p>}
          <div className="journey-checks">{step.checks.map((check) => {
            const missing = check.requires?.filter((id) => !current.completed.includes(id)) ?? [];
            return <div key={check.id}><label><input type="checkbox" checked={current.completed.includes(check.id)} disabled={missing.length > 0} onChange={() => { keyboard.hide(); onChange({ ...state, [role]: toggleJourneyCheck(current, check.id) }); }} /><span>{check[role]}</span></label>{missing.length > 0 && <small>Önce tamamla: {missing.map((id) => id === "identity" ? "Kimlik ve araç belgeleri" : id === "payment-details" ? "Araç, taraf ve tutar bilgileri" : journeySteps.find((s) => s.checks.some((c) => c.id === id))!.title).join(", ")}.</small>}</div>;
          })}</div>
          {step.source && <a className="journey-source" href={step.source.url} target="_blank" rel="noreferrer">{step.source.title}<ArrowRightIcon size={14} /></a>}
        </section>}
      </section>;
    })}</div>
    <div className="decision-note journey-note"><InfoIcon size={18} /><p>Örnek ilan için kişisel süreç rehberi. Gerçek mesaj gönderme, rezervasyon, poliçe, ödeme ve noter entegrasyonu bağlı değil. Kimlik, banka veya poliçe numaranı notlara yazma.</p></div>
    <p className="market-data-note">Kaydettiğin notlar ve işaretler bu tarayıcıda tutulur. Alıcı ve satıcı listeleri birbirinden bağımsızdır.</p>
  </main></MobileScroll>;
}

export default function Prototype() {
  const reduceMotion = useReducedMotion();
  const { device } = useMobileDevice();
  const { screenRef } = useScreenPortal();
  const { bottomInset } = useKeyboardInsets();
  const [decisionTab, setDecisionTab] = useState<DecisionTab>("compare");
  const [sheet, setSheet] = useState<Sheet>(null);
  const captureSession = useCaptureSession();
  const tourPhotos = useMemo(() => captureSession.photos.map((photo) => ({ id: photo.id, angle: photo.angle, pass: photo.pass, url: photo.url, name: photo.file.name })), [captureSession.photos]);
  const [generatedModel, setGeneratedModel] = useState<import("./Vehicle3D").VehicleModelSource>();
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
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(location.search).get("demo") === "1");
  const [sellRequest, setSellRequest] = useState(0);
  const [listingOpen, setListingOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [journey, setJourney] = useState(() => {
    try { return parseJourneyState(JSON.parse(localStorage.getItem(journeyStorageKey) ?? "null")); }
    catch { return parseJourneyState(null); }
  });
  const [journeyStorageError, setJourneyStorageError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(journeyStorageKey, JSON.stringify(journey)); setJourneyStorageError(false); }
    catch { setJourneyStorageError(true); }
  }, [journey]);
  const journeySummary = journeyProgress(journey[journey.role]);
  function openJourney(role?: JourneyRole) {
    keyboard.hide(); setSheet(null); setJourneyOpen(true);
    if (role) setJourney((previous) => ({ ...previous, role }));
  }
  function navigate(tab: MarketplaceTab) { keyboard.hide(); setSheet(null); setListingOpen(false); setJourneyOpen(false); setActiveTab(tab); }
  function openListing() { keyboard.hide(); setJourneyOpen(false); setListingOpen(true); }
  function openDecision(tab: DecisionTab) { keyboard.hide(); setDecisionTab(tab); setSheet("decision"); }

  const [equipment, setEquipment] = useState<EquipmentGroup>("Konfor");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoRegion, setPhotoRegion] = useState(0);
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
    await acceptPhotos(files);
  }

  async function acceptPhotos(files: File[]) {
    if (!files.length || busy.current) return;
    busy.current = true;
    setReading(true);
    setError("");
    const accepted: Photo[] = [];
    const errors: string[] = [];
    try {
      for (const file of files) {
        if (accepted.length >= 1) {
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
          accepted.push({ id: crypto.randomUUID(), url, name: file.name, region: photoRegion });
        } catch {
          errors.push("Bir fotoğraf açılamadı. Başka bir dosya dene.");
        }
      }
      if (accepted.length) {
        const old = photos.find((photo) => photo.region === photoRegion);
        if (old) { URL.revokeObjectURL(old.url); objectUrls.current.delete(old.url); }
        setPhotos((previous) => [...previous.filter((photo) => photo.region !== photoRegion), ...accepted]);
      }
      if (accepted.length) setPhotoRegion((current) => photoRegions.findIndex((_, index) => index > current && !photos.some((photo) => photo.region === index)) === -1 ? current : photoRegions.findIndex((_, index) => index > current && !photos.some((photo) => photo.region === index)));
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

  const titles: Record<Exclude<Sheet, null>, string> = {
    photos: "Fotoğrafların", sell: "Aracını satmaya başla.", decision: "Kararını netleştir.", capture: "Aracını çek", tour: "HD fotoğraf turu", model: "Ek 3D görünüm",
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className={`vehicle-app ${listingOpen && !journeyOpen ? "listing-page" : "market-page"} ${journeyOpen ? "journey-page" : ""}`} style={{ "--app-safe-top": `${device.geometry.safeArea.top}px`, "--app-safe-bottom": `${device.platform === "android" ? 0 : device.geometry.safeArea.bottom}px`, "--app-bottom": `${bottomInset}px` } as CSSProperties} onPointerDownCapture={(event) => {
      // A blur must not move keyboard-attached buttons between pointer-down and click.
      // Portalled sheets handle their own focus after Radix has marked the tap as inside.
      if (keyboard.visible && event.target instanceof Element && event.currentTarget.contains(event.target) && event.target.closest("button")) event.preventDefault();
    }}>
      <header className="app-header">
        {(listingOpen || journeyOpen) && <button className="icon-button" aria-label="Geri dön" onClick={() => { keyboard.hide(); if (journeyOpen) setJourneyOpen(false); else setListingOpen(false); }}><ArrowLeftIcon size={24} weight="light" /></button>}
        <span className="wordmark">Sattım Gitti<span className="brand-dot">.</span></span>
        <div className="header-actions">{demoMode && <button className="market-text-button" onClick={() => { navigate("explore"); setDemoMode(false); }}>Canlı ilanlar</button>}{listingOpen && !journeyOpen && <button className="icon-button" aria-label={favorite ? "Favorilerden çıkar" : "Favorilere ekle"} aria-pressed={favorite} onClick={() => setFavorite(!favorite)}><HeartIcon size={25} weight={favorite ? "fill" : "light"} /></button>}<button className="sell-entry" onClick={() => { if (demoMode) setSheet("sell"); else { navigate("explore"); setSellRequest((value) => value + 1); } }}><PlusIcon size={17} /><span>Araç sat</span></button></div>
      </header>
      {!demoMode && <CloudMarketplace activeTab={listingOpen || journeyOpen ? "listing" : activeTab} sellRequest={sellRequest} onNavigate={navigate} onDemo={() => { navigate("explore"); setDemoMode(true); }} onPreparePhotos={() => setSheet("photos")} />}
      {demoMode && <Marketplace activeTab={listingOpen || journeyOpen ? "listing" : activeTab} onJourney={() => openJourney()} journeySummary={`${journeySummary.done}/${journeySummary.total} adım · ${journey.role === "buyer" ? "Alıcı" : "Satıcı"}`} favorite={favorite} onFavorite={() => setFavorite(!favorite)} onListing={openListing} onDecision={openDecision} onNavigate={navigate} onPhotos={() => setSheet("photos")} photoCount={photos.length} />}
      {journeyOpen && <SalesJourney key={journey.role} state={journey} onChange={setJourney} storageError={journeyStorageError} />}
      {listingOpen && !journeyOpen && <MobileScroll className="vehicle-scroll">
        <main className="vehicle-content">
          <div className="intro listing-intro">
            <span className="eyebrow">ÖRNEK İLAN</span>
            <h1>{demoListing.name}</h1>
            <p>{demoListing.version}</p>
            <div className="listing-price"><strong>{demoListing.price} <span>₺</span></strong><span className="listing-location"><MapPinIcon size={14} weight="light" />{demoListing.location}</span></div>
          </div>
          <div className="car-stage">
            <img className="hero-car" src="/assets/car-front.png" alt="Örnek gümüş SUV, ön çapraz görünüm" draggable={false} />
          </div>
          <button className="secondary-button" onClick={() => setSheet("photos")}><ImagesIcon size={21} />Fotoğraflarını ekle</button>
          <dl className="quick-facts" aria-label="Temel araç özellikleri">
            <div><CalendarBlankIcon size={23} weight="light" /><dt>Model yılı</dt><dd>{demoListing.year}</dd></div>
            <div><GaugeIcon size={23} weight="light" /><dt>Kilometre</dt><dd>{demoListing.mileage} <small>km</small></dd></div>
            <div><GearIcon size={23} weight="light" /><dt>Vites</dt><dd>{demoListing.transmission}</dd></div>
            <div><GasPumpIcon size={23} weight="light" /><dt>Yakıt</dt><dd>{demoListing.fuel}</dd></div>
          </dl>
          <button className="journey-entry listing-journey-entry" onClick={() => openJourney("buyer")}><ShieldCheckIcon size={25} weight="light" /><span><strong>Bu aracı alırken yanındayız.</strong><small>Mesajdan notere, adım adım ilerle</small></span><ArrowRightIcon size={20} /></button>
          <button className="decision-entry listing-decision-entry" onClick={() => openDecision("compare")}><ScalesIcon size={24} weight="light" /><span><strong>Kararını netleştir</strong><small>Karşılaştırma, fiyat ve kullanım maliyeti</small></span><CaretRightIcon size={18} /></button>
          {photos.length > 0 && <button className="photo-summary" onClick={() => setSheet("photos")}><ImagesIcon size={20} /><span>{photos.length} fotoğraf eklendi</span><span className="muted">Fotoğraf eklendi</span><CaretRightIcon size={16} /></button>}
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
              <div className="information-body"><dl className="specification-list history-list">{historySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="source-note"><InfoIcon size={19} /><p>Eksik bilgi, hasarsız anlamına gelmez. Fotoğraf bulguları boya veya değişen raporu yerine geçmez.</p></div></div>
            </details>
            <details className="information-section" data-testid="advertisement-section">
              <summary><FileTextIcon size={25} weight="light" /><span><strong>İlan & satıcı</strong><small>Açıklama ve satış bilgileri</small></span><CaretDownIcon size={18} /></summary>
              <div className="information-body"><div className="listing-seller"><span className="seller-avatar"><UserIcon size={23} weight="light" /></span><div><strong>Bireysel satıcı</strong><span>{demoListing.location}</span></div><small>Örnek profil</small></div><dl className="specification-list">{advertisementSpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3 className="description-title">Satıcının notu</h3><p className="seller-description">Aracımı model yükseltmek için satıyorum. Kullanılmadığı zaman kapalı otoparkta tutuldu. İncelemek isteyenler kendi ekspertizini yaptırabilir.</p><p className="data-source">Fiyat, kilometre, donanım ve satıcı açıklaması tasarım için hazırlanmış örnek verilerdir. Canlı bir satış ilanı değildir.</p></div>
            </details>
          </section>
        </main>
      </MobileScroll>}
      <footer className="app-footer">
        {listingOpen && !journeyOpen && <button className="primary-button" onClick={() => setSheet("photos")}><CameraIcon size={25} weight="light" /><span>Fotoğraflarını ekle</span></button>}
        <nav className="bottom-nav" aria-label="Ana gezinme">
          {([{ id: "explore", label: "Keşfet", Icon: MagnifyingGlassIcon }, { id: "favorites", label: "Kaydedilenler", Icon: BookmarkSimpleIcon }, { id: "account", label: "Hesabım", Icon: UserIcon }] as const).map(({ id, label, Icon }) => {
            const selected = (journeyOpen || activeTab === "tracking" ? "favorites" : activeTab) === id;
            return <button key={id} className={selected ? "selected" : ""} aria-current={selected ? "page" : undefined} onClick={() => navigate(id)}><span className="nav-icon">{selected && <motion.span className="nav-selection" layoutId="navigation-selection" aria-hidden="true" initial={false} transition={{ duration: reduceMotion ? 0 : .22, ease: [.22, 1, .36, 1] }} />}<Icon size={25} weight={selected ? "fill" : "light"} /></span><span>{label}</span></button>;
          })}
        </nav>
        {favoriteStorageError && <span className="favorite-storage-error" role="status">Favorin yalnızca bu oturumda saklanıyor.</span>}
      </footer>
      <input ref={fileInput} className="file-input" type="file" accept="image/jpeg,image/png,image/webp" tabIndex={-1} aria-label="Bölge fotoğrafını seç" onChange={addPhotos} disabled={reading} /><input ref={cameraInput} className="file-input" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-label="Bölge fotoğrafını çek" onChange={addPhotos} disabled={reading} />
      <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) { keyboard.hide(); setCameraOpen(false); setSheet(null); } }} title={sheet ? titles[sheet] : ""} description={sheet === "capture" ? "Önce HD fotoğraf turu, istersen ek 3D görünüm." : sheet === "tour" ? "Aracının orijinal çekimlerini incele." : sheet === "model" ? "Fotoğraflarından üretilen ek geometri." : sheet === "decision" ? "İhtiyacına göre karşılaştır, verinin kaynağını gör." : sheet === "photos" ? "Aracın farklı açılarını ekle." : "Fotoğraflarınla ilk adımı at."} snap={sheet === "decision" || sheet === "capture" || sheet === "tour" || sheet === "model" ? 0.92 : sheet === "photos" ? 0.82 : 0.73}>
        <button className="sheet-close icon-button" aria-label="Paneli kapat" onPointerDown={(event) => { if (keyboard.visible) event.preventDefault(); }} onClick={() => { keyboard.hide(); setSheet(null); }}><XIcon size={20} /></button>
        {sheet === "capture" && <CaptureFlow session={captureSession} onTour={() => setSheet("tour")} onModel={(model) => { setGeneratedModel({ name: "Aracının 3D modeli", ...model, reconstructed: true }); setSheet("model"); }} />}
        {sheet === "tour" && <><VehicleTour photos={tourPhotos} /><button className="secondary-button" onClick={() => setSheet("capture")}><CameraIcon size={22} />Çekimleri düzenle / tamamla</button>{generatedModel && <button className="scan-text-button" onClick={() => setSheet("model")}>Ek 3D görünümü aç</button>}</>}
        {sheet === "model" && generatedModel && <Suspense fallback={<p role="status">3D görünüm açılıyor…</p>}><Vehicle3D initialModel={generatedModel} onPartSelect={() => {}} embedded /></Suspense>}
        {sheet === "decision" && <DecisionSupport initialTab={decisionTab} favorite={favorite} onFollowPrice={() => { setFavorite(true); navigate("tracking"); }} />}
        {sheet === "photos" && <div className="upload-content">{tourPhotos.length > 0 && <button className="primary-button" onClick={() => { setCameraOpen(false); setSheet("tour"); }}><ImagesIcon size={22} />Kendi fotoğraf turumu aç</button>}<button className="secondary-button" onClick={() => { setCameraOpen(false); setSheet("capture"); }}><CameraIcon size={22} />{tourPhotos.length ? "HD tur çekimine devam et" : "HD fotoğraf turu için çekime başla"}</button>
          <div className="capture-guide"><CarSimpleIcon size={38} weight="light" /><div><strong>Aracını adım adım göster.</strong><p>Her bölge için fotoğraf çek veya galerinden uygun bir fotoğraf seç.</p></div></div>
          <p className="upload-status" role="status">{photos.length} / {PHOTO_LIMIT} bölge tamamlandı · {photoRegion + 1}. adım</p>
          <div className="region-current"><h3>{photoRegions[photoRegion].label}</h3><p>{photoRegions[photoRegion].hint} Gün ışığında, net ve engellerden uzak çek.</p>{photos.filter((photo) => photo.region === photoRegion).map((photo) => <figure key={photo.id}><img src={photo.url} alt={`${photoRegions[photoRegion].label} fotoğrafı`} /><button type="button" className="remove-photo" aria-label={`${photoRegions[photoRegion].label} fotoğrafını kaldır`} onClick={() => removePhoto(photo)}><TrashIcon size={17} /></button></figure>)}</div>
          {error && <p className="upload-error" role="alert">{error}</p>}
          {!cameraOpen && <button className="primary-button" disabled={reading} onClick={() => setCameraOpen(true)}><CameraIcon size={22} />Fotoğraf çek</button>}
          {cameraOpen && <PhotoCamera label={photoRegions[photoRegion].label} hint={photoRegions[photoRegion].hint} onClose={() => setCameraOpen(false)} onCapture={(file) => { setCameraOpen(false); void acceptPhotos([file]); }} onFallback={() => { setCameraOpen(false); cameraInput.current?.click(); }} />}
          <button className="secondary-button" disabled={reading} onClick={() => fileInput.current?.click()}><ImagesIcon size={21} />Galeriden seç</button>
          <div className="region-list" aria-label="Araç bölgeleri">{photoRegions.map((region, index) => <button type="button" key={region.label} className={index === photoRegion ? "region-step active" : "region-step"} aria-pressed={index === photoRegion} onClick={() => { setCameraOpen(false); setPhotoRegion(index); }}><span>{index + 1}</span><strong>{region.label}</strong><small>{photos.some((photo) => photo.region === index) ? "Eklendi" : "Eksik"}</small></button>)}</div>
          <div className="source-note"><InfoIcon size={20} /><p>Fotoğraflar bu oturumda cihazında tutulur. Bölge uygunluğu otomatik doğrulanmaz; fotoğrafı kontrol et.</p></div>
          {photos.length > 0 && <button className="secondary-button" onClick={() => setSheet(null)}><CheckCircleIcon size={20} />Araca dön</button>}
        </div>}
        {sheet === "sell" && <div className="sell-content">{tourPhotos.length > 0 && <button className="primary-button" onClick={() => { setCameraOpen(false); setSheet("tour"); }}><ImagesIcon size={22} />Kendi fotoğraf turumu aç</button>}<button className="secondary-button" onClick={() => { setCameraOpen(false); setSheet("capture"); }}><CameraIcon size={22} />{tourPhotos.length ? "HD tur çekimine devam et" : "HD fotoğraf turu için çekime başla"}</button><div className="sell-intro"><CameraIcon size={34} weight="light" /><h2>Aracınla başlayalım.</h2><p>Aracının net fotoğraflarını ekle. Ön, arka, iki yan ve iç mekânı göster.</p></div><button className="primary-button" onClick={() => setSheet("photos")}><ImagesIcon size={22} />İlan fotoğraflarını ekle</button><button className="secondary-button" onClick={() => openJourney("seller")}><ShieldCheckIcon size={21} />Satış sürecini planla<ArrowRightIcon size={18} /></button><p className="market-data-note">Bu prototipte fotoğraf hazırlayabilirsin. İlan yayınlama ve satıcı iletişimi henüz bağlı değil.</p></div>}
      </BottomSheet>
    </div>
    </MotionConfig>
  );
}
