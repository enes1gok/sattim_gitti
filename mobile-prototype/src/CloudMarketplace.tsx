import { PhotoCamera } from "./PhotoCamera";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { App as NativeApp } from "@capacitor/app";
import { ArrowRightIcon, BookmarkSimpleIcon, CalendarBlankIcon, CameraIcon, CaretRightIcon, CarIcon, CompassIcon, GasPumpIcon, GaugeIcon, GearSixIcon, HeartIcon, MagnifyingGlassIcon, MapPinIcon, ShieldCheckIcon, SignOutIcon, SlidersHorizontalIcon, TrashIcon, UserIcon, XIcon } from "@phosphor-icons/react";
import { BottomSheet, Carousel, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard } from "./mobile";
import { SavedHeader, type MarketplaceTab } from "./Marketplace";
import { authRedirectUrl, supabase } from "./supabase";
import { isNativeAndroid } from "./mobile/native";
import { defaults, filterGroups, type Filters } from "./search-data";
import { money } from "./decision-data";
import { photoRegions } from "./photo-guide";
import { Onboarding } from "./Onboarding";
import { explainMatch, onboardingKey, readOnboarding, type Onboarding as OnboardingState } from "./marketplace-guidance";
import brandLogos from "./brand-logos.json";
import turkeyNewModels from "./turkey-new-models.json";
import { emptyCloudSearch, errorMessage, getFavorites, getListing, getListings, getMakes, getModels, getSavedSearches, pageSize, removePhoto, removeSearch, saveDraft, saveSearch, setListingStatus, toggleFavorite, uploadPhoto, type CatalogOption, type CloudSearch, type Listing, type ListingInput, type SavedSearch } from "./marketplace-api";

type Props = { activeTab: MarketplaceTab | "listing"; sellRequest: number; onNavigate: (tab: MarketplaceTab) => void; onDemo: () => void; onPreparePhotos: () => void };
type Panel = "auth" | "editor" | "filters" | "detail" | "onboarding" | null;
const fuels = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik", "Diğer"];
const bodies = ["SUV", "Sedan", "Hatchback", "Station wagon", "Coupe", "Cabrio", "Diğer"];
function TextField({ label, value, onChange, numeric = false, type = "text", required = false, maxLength = 120, error }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; type?: string; required?: boolean; maxLength?: number; error?: string }) {
  const keyboard = useKeyboard();
  return <label className="cloud-field"><span>{label}</span><KeyboardInput aria-label={label} aria-invalid={error ? true : undefined} aria-describedby={error ? `field-error-${label}` : undefined} type={type} inputMode={numeric ? "numeric" : undefined} value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} onBlur={() => keyboard.hide()} autoCapitalize={type === "email" ? "none" : undefined} />{error && <small id={`field-error-${label}`} className="cloud-field-error">{error}</small>}</label>;
}
function SelectField({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  const keyboard = useKeyboard();
  return <label className="cloud-field"><span>{label}</span><select aria-label={label} value={value} disabled={disabled} onFocus={() => keyboard.hide()} onChange={(event) => { keyboard.hide(); onChange(event.target.value); }}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
function BrandMark({ name }: { name: string }) {
  const logo = (brandLogos as Record<string, string>)[name];
  return <span className="catalog-brand-mark" aria-hidden="true">{logo ? <img src={`${import.meta.env.BASE_URL}brand-logos/${logo}`} alt="" /> : <span>{name.trim().slice(0, 1).toLocaleUpperCase("tr-TR")}</span>}</span>;
}
function catalogKey(value: string) { return value.toLocaleLowerCase("tr-TR").replaceAll("ı", "i").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
// Combined manufacturer or chassis/coachbuilder labels are not standalone makes.
// Keep a previously selected value available when editing an existing draft.
const combinedMakes = new Set(["Audi-Porsche", "Chevrolet GMC", "Citroen-DS", "Fiat Burstner", "Fiat-Chausson", "Fiat-Dethleffs", "Fiat/Lmc", "Ford/Challenger", "Ford-Hymer", "Iveco-Concorde"].map(catalogKey));
function CatalogTrigger({ label, value, options, disabled, onOpen }: { label: string; value: string; options: CatalogOption[]; disabled?: boolean; onOpen: () => void }) {
  const selected = options.find((option) => option.id === value);
  return <div className="catalog-picker"><span className="catalog-picker-label">{label}</span>
    <button type="button" className="catalog-picker-trigger" disabled={disabled} onClick={onOpen}>
      <span className={selected ? "catalog-picker-value" : "catalog-placeholder"}>{selected && label === "Marka" && <BrandMark name={selected.name} />}{selected?.name ?? (disabled && label === "Model" ? "Önce marka seç" : `${label} seç`)}</span><CaretRightIcon size={18} />
    </button></div>;
}
function CatalogSelection({ label, value, onChange, onBack, options, preferredNames }: { label: string; value: string; onChange: (value: string) => void; onBack: () => void; options: CatalogOption[]; preferredNames?: string[] }) {
  const keyboard = useKeyboard();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const normalized = catalogKey(query.trim());
  const preferred = new Set(preferredNames?.map(catalogKey) ?? []);
  const hasPreferred = options.some((option) => preferred.has(catalogKey(option.name)));
  const matches = options.filter((option) => (!hasPreferred || showAll || preferred.has(catalogKey(option.name)) || option.id === value) && catalogKey(option.name).includes(normalized)).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return <section className="catalog-selection app-content-enter" aria-label={`${label} seçimi`} onPointerDownCapture={(event) => { if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) event.preventDefault(); }}>
    <div className="catalog-selection-heading"><button type="button" className="catalog-selection-back" aria-label="Araç bilgilerine dön" onClick={() => { keyboard.hide(); onBack(); }}>←</button><div><h2>{label} seç</h2><p>{label === "Marka" ? "Aracının markasını bul." : "Aracının modelini bul."}</p></div></div>
    <label className="catalog-picker-search"><MagnifyingGlassIcon size={20} /><KeyboardInput aria-label={`${label} ara`} placeholder={`${label} ara`} value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => keyboard.hide()} /></label>
    {preferredNames && hasPreferred && <div className="catalog-picker-scope"><span>{showAll ? "Tüm modeller" : "Türkiye'de yeni araç listesinde"}</span><button type="button" onClick={() => { keyboard.hide(); setShowAll(!showAll); }}>{showAll ? "Türkiye listesini göster" : "Tüm modelleri göster"}</button></div>}
    <div className="catalog-selection-count">{matches.length} {label.toLocaleLowerCase("tr-TR")}</div>
    <div className="catalog-selection-options" aria-label={`${label} seçenekleri`}>
      {matches.map((option) => <button type="button" key={option.id} className="catalog-picker-option" aria-pressed={option.id === value} onClick={() => { keyboard.hide(); onChange(option.id); }}><span className="catalog-picker-value">{label === "Marka" && <BrandMark name={option.name} />}{option.name}</span>{option.id === value && <span className="catalog-picker-selected" aria-label="Seçili">✓</span>}</button>)}
      {!matches.length && <p className="catalog-picker-empty">Sonuç bulunamadı. {hasPreferred && !showAll ? "Eski veya farklı modeller için tüm modelleri göster." : "Farklı bir adla aramayı dene."}</p>}
    </div>
    {preferredNames && <p className="catalog-picker-hint">Türkiye listesi güncel sıfır araç verisine dayanır; eski ve diğer modeller tüm listede yer alabilir. Kaynak: <a href={turkeyNewModels.url}>arabayorum.com</a> · CC BY 4.0.</p>}
  </section>;
}
function AuthForm({ onDone, recovery = false }: { onDone: () => void; recovery?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "recovery">(recovery ? "recovery" : "signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const keyboard = useKeyboard();
  async function submit(event: FormEvent) {
    event.preventDefault(); keyboard.hide(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "recovery") {
        const result = await supabase.auth.updateUser({ password }); if (result.error) throw result.error; onDone();
      } else if (mode === "reset") {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: isNativeAndroid ? authRedirectUrl : `${location.origin}/?reset=1` }); if (result.error) throw result.error;
        setMessage("Adresin kayıtlıysa şifre yenileme bağlantısı gönderildi.");
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirectUrl } }); if (result.error) throw result.error;
        if (result.data.session) onDone(); else setMessage("Doğrulama e-postasındaki bağlantıyı açtıktan sonra buradan giriş yap. Spam klasörünü de kontrol et.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (result.error) throw result.error; onDone();
      }
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  return <form key={mode} className="cloud-form cloud-auth-form app-content-enter" onPointerDownCapture={(event) => { if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) event.preventDefault(); }} onSubmit={submit}>
    {mode !== "recovery" && <TextField label="E-posta" type="email" value={email} onChange={setEmail} required maxLength={254} />}
    {mode !== "reset" && <><TextField label={mode === "recovery" ? "Yeni şifre" : "Şifre"} type="password" value={password} onChange={setPassword} required maxLength={128} />{mode !== "signin" && <small>En az 8 karakter kullan.</small>}</>}
    {error && <p className="upload-error" role="alert">{error}</p>}{message && <p className="cloud-status" role="status">{message}</p>}
    <button className="primary-button" disabled={busy || ((mode === "signup" || mode === "recovery") && password.length < 8)}>{busy ? "İşleniyor…" : mode === "signup" ? "Hesap oluştur" : mode === "reset" ? "Yenileme bağlantısı gönder" : mode === "recovery" ? "Şifreyi kaydet" : "Giriş yap"}<ArrowRightIcon size={19} /></button>
    {mode !== "recovery" && <div className="cloud-auth-links"><button className="market-text-button" type="button" disabled={busy} onClick={() => { keyboard.hide(); setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Zaten hesabım var" : "Yeni hesap oluştur"}</button>{mode !== "reset" && <button className="market-text-button" type="button" disabled={busy} onClick={() => { setMode("reset"); setError(""); }}>Şifremi unuttum</button>}</div>}
  </form>;
}
const sellDraftKey = "sattim-gitti-sell-in-progress-v1";
const sellSteps = ["Aracını seç", "Aracını tanımla", "Durumunu anlat", "Fotoğraflar", "İlan bilgileri", "Önizleme"];
const bodyLabels: Record<string, string> = { suv: "SUV", sedan: "Sedan", hatchback: "Hatchback", wagon: "Station wagon", coupe: "Coupe", convertible: "Cabrio" };
function readSellDraft() { try { return JSON.parse(sessionStorage.getItem(sellDraftKey) ?? "null"); } catch { return null; } }
function DraftForm({ initial, userId, onAuth, onDone, onBusy, onChanged }: { initial: Listing | null; userId?: string; onAuth: () => void; onDone: (listing: Listing) => void; onBusy: (busy: boolean) => void; onChanged: () => void }) {
  const keyboard = useKeyboard();
  const [makes, setMakes] = useState<CatalogOption[]>([]); const [models, setModels] = useState<CatalogOption[]>([]);
  const [restored] = useState(() => initial ? null : readSellDraft());
  const [picker, setPicker] = useState<"make" | "model" | null>(null);
  const [step, setStep] = useState<number>(() => Math.min(5, Math.max(0, Number(restored?.step) || 0)));
  const [makeId, setMakeId] = useState<string>(restored?.makeId ?? ""); const [modelId, setModelId] = useState<string>(initial?.model_id ?? restored?.modelId ?? "");
  const [fields, setFields] = useState<Record<"title" | "description" | "price" | "year" | "mileage" | "city" | "district" | "fuel" | "transmission" | "body" | "paint" | "replacement", string>>({ title: initial?.title ?? "", description: initial?.description ?? "", price: String(initial?.price ?? ""), year: String(initial?.year ?? ""), mileage: String(initial?.mileage ?? ""), city: initial?.city ?? "", district: initial?.district ?? "", fuel: initial?.fuel ?? "", transmission: initial?.transmission ?? "", body: initial?.body ?? "", paint: initial?.paint ?? "unknown", replacement: initial?.replacement ?? "unknown", ...(restored?.fields ?? {}) });
  const [draftId, setDraftId] = useState(initial?.id); const [photos, setPhotos] = useState(initial?.photos ?? []);
  const [files, setFiles] = useState<{ file: File; position: number }[]>([]); const [previews, setPreviews] = useState<string[]>([]);
  const [photoRegion, setPhotoRegion] = useState(0);
  const [confirmedPhotos, setConfirmedPhotos] = useState<number[]>([]);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [status, setStatus] = useState("");
  const [listingAttempted, setListingAttempted] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { if (!initial) { try { sessionStorage.setItem(sellDraftKey, JSON.stringify({ makeId, modelId, fields, step })); setStorageError(false); } catch { setStorageError(true); } } }, [initial, makeId, modelId, fields, step]);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.closest(".sheet-content")?.scrollTo({ top: 0 }); }, [step, picker]);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    getMakes().then(async (rows) => {
      if (!active) return; setMakes(rows);
      if (initial) { const { data, error: failure } = await supabase.from("vehicle_models").select("make_id").eq("id", initial.model_id).single(); if (failure) throw failure; if (active) setMakeId(data.make_id); }
    }).catch((cause) => { if (active) setError(errorMessage(cause)); }).finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [catalogAttempt, initial?.id]);
  useEffect(() => { let active = true; setModels([]); if (makeId) getModels(makeId).then((rows) => { if (active) setModels(rows); }).catch((cause) => { if (active) setError(errorMessage(cause)); }); return () => { active = false; }; }, [makeId, catalogAttempt]);
  useEffect(() => { const urls = files.map(({ file }) => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(URL.revokeObjectURL); }, [files]);
  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (file) acceptPhoto(file);
  }
  function acceptPhoto(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Bu dosya türü desteklenmiyor. JPG, PNG veya WebP seç."); return; }
    if (file.size > 8388608) { setError("Fotoğraf 8 MB sınırını aşıyor. Daha küçük bir fotoğraf seç."); return; }
    setFiles((previous) => [...previous.filter((item) => item.position !== photoRegion), { file, position: photoRegion }]); setError("");

  }
  function field(key: keyof typeof fields, value: string) { setFields((previous) => ({ ...previous, [key]: value })); }
  const validYear = /^\d{4}$/.test(fields.year) && Number(fields.year) >= 1886 && Number(fields.year) <= new Date().getFullYear() + 1;
  const validBasics = !!modelId && validYear;
  const validDetails = !!fields.body && !!fields.fuel && !!fields.transmission && /^\d+$/.test(fields.mileage);
  const validListing = fields.title.trim().length >= 5 && /^\d+$/.test(fields.price) && Number(fields.price) > 0 && fields.city.trim().length >= 2;
  const missingPhotos = photoRegions.filter((_, position) => !files.some((item) => item.position === position) && !confirmedPhotos.includes(position));
  const photosReady = missingPhotos.length === 0;
  const selectedPhoto = files.findIndex((item) => item.position === photoRegion);
  const nextPhotoRegion = photoRegions.findIndex((_, position) => position !== photoRegion && !files.some((item) => item.position === position) && !confirmedPhotos.includes(position));
  const recommendedBodies = (models.find((model) => model.id === modelId)?.body_types ?? []).map((value) => bodyLabels[value]).filter(Boolean);
  function nextStep() {
    keyboard.hide(); setCameraOpen(false); setError("");
    if (step === 0 && !validBasics) { setError("Marka, model ve geçerli model yılı seç."); return; }
    if (step === 1 && !validDetails) { setError("Kasa tipi, yakıt ve vites seç; kilometreyi noktasız yaz."); return; }
    if (step === 4 && !validListing) { setListingAttempted(true); setError("İşaretlenen alanları kontrol et."); return; }
    setStep((value) => Math.min(value + 1, 5));
  }
  async function persist(publish: boolean) {
    keyboard.hide(); setError("");
    if (!userId) { onAuth(); return; }
    if (!validDetails) { setStep(1); setError("Kasa tipi, yakıt ve vites seç; kilometreyi noktasız yaz."); return; }
    if (!modelId || fields.title.trim().length < 5 || !/^\d+$/.test(fields.price) || Number(fields.price) < 1 || !/^\d+$/.test(fields.mileage) || !/^\d{4}$/.test(fields.year) || Number(fields.year) < 1886 || Number(fields.year) > new Date().getFullYear() + 1 || fields.city.trim().length < 2) { setError("Marka/model seç; başlığı, fiyatı, kilometreyi, yılı ve ili kontrol et. Sayıları noktasız yaz."); return; }
    if (publish && photoRegions.some((_, position) => !files.some((item) => item.position === position) && !confirmedPhotos.includes(position))) { setError("Yayımlamak için tüm bölgelerin fotoğrafını ekle ve mevcut fotoğrafların uygunluğunu onayla."); return; }
    setBusy(true); onBusy(true); let currentId = draftId;
    try {
      const input: ListingInput = { ...fields, model_id: modelId, title: fields.title.trim(), city: fields.city.trim(), district: fields.district.trim(), price: Number(fields.price), year: Number(fields.year), mileage: Number(fields.mileage) };
      currentId = await saveDraft(input, currentId); setDraftId(currentId);
      const positions = new Set(photos.map((photo) => photo.position));
      for (let index = 0; index < files.length; index++) {
        const { file, position } = files[index];
        if (positions.has(position)) throw new Error("Bu bölgedeki mevcut fotoğrafı önce kaldır.");
        setStatus(`${index + 1} / ${files.length} fotoğraf yükleniyor…`);
        await uploadPhoto(currentId, userId, file, position); positions.add(position);
        setFiles((previous) => previous.filter((item) => item.position !== position));
      }
      if (publish) { setStatus("İlan yayımlanıyor…"); await setListingStatus(currentId, "published"); }
      if (!initial) { try { sessionStorage.removeItem(sellDraftKey); } catch { /* Storage unavailable. */ } }
      onDone(await getListing(currentId));
    } catch (cause) {
      setError(errorMessage(cause));
      if (currentId) { try { setPhotos((await getListing(currentId)).photos); } catch { /* Preserve the draft and show the original error. */ } }
      onChanged();
    } finally { setBusy(false); onBusy(false); setStatus(""); }
  }
  const visibleMakes = makes.filter((make) => make.id === makeId || !combinedMakes.has(catalogKey(make.name)));
  const preferredNames = Object.entries(turkeyNewModels.models).find(([name]) => catalogKey(name) === catalogKey(makes.find((make) => make.id === makeId)?.name ?? ""))?.[1] ?? [];
  const checklist = [
    { label: "Marka, model ve yıl", ready: validBasics, step: 0 },
    { label: "Araç özellikleri", ready: validDetails, step: 1 },
    { label: `Fotoğraflar · ${8 - missingPhotos.length}/8`, ready: photosReady, step: 3 },
    { label: "Başlık, fiyat ve konum", ready: validListing, step: 4 },
  ];
  if (picker) return <CatalogSelection key={picker} label={picker === "make" ? "Marka" : "Model"} value={picker === "make" ? makeId : modelId} options={picker === "make" ? visibleMakes : models} preferredNames={picker === "model" ? preferredNames : undefined} onBack={() => setPicker(null)} onChange={(value) => { if (picker === "make" && value !== makeId) { setMakeId(value); setModelId(""); field("body", ""); } else if (picker === "model" && value !== modelId) { setModelId(value); field("body", ""); } setPicker(null); }} />;
  return <form ref={formRef} className="cloud-form" onPointerDownCapture={(event) => { if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) event.preventDefault(); }} onSubmit={(event) => { event.preventDefault(); void persist(true); }}>
    <div className="sell-progress"><div><span>ADIM {step + 1} / 6</span><strong>{sellSteps[step]}</strong></div><div className="sell-progress-track" aria-hidden="true"><span style={{ width: `${(step + 1) / 6 * 100}%` }} /></div></div>
    <details className="sell-checklist"><summary>İlan hazırlığın <span>{checklist.filter((item) => item.ready).length} / 4 tamamlandı</span></summary><div>{checklist.map((item) => <button key={item.step} type="button" disabled={busy} onClick={() => { keyboard.hide(); setCameraOpen(false); setError(""); setStep(item.step); }}><span aria-hidden="true">{item.ready ? "✓" : "○"}</span><strong>{item.label}</strong><small>{item.ready ? "Hazır" : "Tamamla →"}</small></button>)}</div></details>
    <fieldset key={step} disabled={busy} className="cloud-fieldset app-content-enter">
      {step === 0 && <><div className="sell-intro"><h2>Aracını seç.</h2><p>Önce aracının marka, model ve yılını belirleyelim.</p></div>
      {catalogLoading && <small>Markalar yükleniyor…</small>}
      <CatalogTrigger label="Marka" value={makeId} onOpen={() => { keyboard.hide(); setPicker("make"); }} disabled={catalogLoading || !makes.length} options={visibleMakes} />
      <CatalogTrigger label="Model" value={modelId} onOpen={() => { keyboard.hide(); setPicker("model"); }} disabled={!makeId || !models.length} options={models} />
      {!makes.length && !catalogLoading && <button type="button" className="secondary-button" onClick={() => setCatalogAttempt((value) => value + 1)}>Kataloğu yeniden yükle</button>}
      <SelectField label="Model yılı" value={fields.year} onChange={(value) => field("year", value)} options={[{ value: "", label: "Model yılı seç" }, ...Array.from({ length: new Date().getFullYear() + 2 - 1886 }, (_, index) => { const value = String(new Date().getFullYear() + 1 - index); return { value, label: value }; })]} /></>}
      {step === 1 && <><div className="sell-intro"><h2>Aracını tanımla.</h2><p>Alıcıların aracını daha kolay bulması için temel bilgileri ekle.</p></div>
      <SelectField label="Kasa tipi" value={fields.body} onChange={(value) => field("body", value)} options={[{ value: "", label: "Kasa tipi seç" }, ...bodies.map((value) => ({ value, label: recommendedBodies.includes(value) ? `${value} · Önerilen` : value }))]} />
      {recommendedBodies.length > 0 && <small>Katalogda görülen kasa tipleri: {recommendedBodies.join(", ")}. Bu liste aracına ait doğrulanmış bilgi değildir; uygun kasa tipini seç.</small>}
      <TextField label="Kilometre" value={fields.mileage} onChange={(value) => field("mileage", value)} numeric maxLength={7} />
      <div className="cloud-pair"><SelectField label="Yakıt" value={fields.fuel} onChange={(value) => field("fuel", value)} options={[{ value: "", label: "Yakıt seç" }, ...fuels.map((value) => ({ value, label: value }))]} /><SelectField label="Vites" value={fields.transmission} onChange={(value) => field("transmission", value)} options={[{ value: "", label: "Vites seç" }, ...["Otomatik", "Manuel"].map((value) => ({ value, label: value }))]} /></div></>}
      {step === 2 && <><div className="sell-intro"><h2>Durumunu anlat.</h2><p>Bildiklerini paylaş; emin değilsen bilinmiyor seçeneğini kullan.</p></div>
      {(["paint", "replacement"] as const).map((key) => <SelectField key={key} label={key === "paint" ? "Boya durumu (beyanın)" : "Değişen parça (beyanın)"} value={fields[key]} onChange={(value) => field(key, value)} options={[{ value: "unknown", label: "Bilmiyorum / belirtilmedi" }, { value: "none", label: key === "paint" ? "Boyasız" : "Değişensiz" }, { value: "present", label: "Var" }]} />)}</>}
      {step === 3 && <><div className="sell-intro"><h2>Aracını göster.</h2><p>Taslağını eksik fotoğraflarla kaydedebilirsin. Yayımlamak için 8 bölgenin tamamı gerekir.</p></div>
      <div className="photo-progress"><strong>Araç fotoğrafları</strong><span>{8 - missingPhotos.length} / 8 hazır</span></div>
      {!photosReady && <button type="button" className="sell-photo-help" onClick={() => { setCameraOpen(false); setPhotoRegion(photoRegions.findIndex((_, position) => !files.some((item) => item.position === position) && !confirmedPhotos.includes(position))); }}>{missingPhotos[0].label} fotoğrafını {photos.some((photo) => photo.position === photoRegions.indexOf(missingPhotos[0])) ? "kontrol et" : "ekle"}<ArrowRightIcon size={17} /></button>}
      <div className="region-current sell-photo-current"><div className="photo-current-heading"><span>{photoRegion + 1} / 8</span><h3>{photoRegions[photoRegion].label}</h3></div><p>{photoRegions[photoRegion].hint} Gün ışığında ve net çek.</p>
        {photos.filter((photo) => photo.position === photoRegion).map((photo) => <div key={photo.id}><figure><img src={photo.url} alt={`${photoRegions[photoRegion].label} için kayıtlı fotoğraf`} /><button type="button" className="remove-photo" aria-label="Kayıtlı fotoğrafı kaldır" onClick={() => setRemovingPhoto(photo.id)}><XIcon /></button></figure>{removingPhoto === photo.id && <div className="photo-remove-confirm"><p>Bu kayıtlı fotoğraf kaldırılacak. Devam etmek istiyor musun?</p><button type="button" className="secondary-button" onClick={() => setRemovingPhoto(null)}>Vazgeç</button><button type="button" className="secondary-button" onClick={async () => { setBusy(true); onBusy(true); try { await removePhoto(photo); setPhotos((previous) => previous.filter((item) => item.id !== photo.id)); setConfirmedPhotos((previous) => previous.filter((item) => item !== photo.position)); setRemovingPhoto(null); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); onBusy(false); } }}>Fotoğrafı kaldır</button></div>}<label className="region-confirm"><input type="checkbox" checked={confirmedPhotos.includes(photoRegion)} onChange={(event) => setConfirmedPhotos((previous) => event.target.checked ? [...previous, photoRegion] : previous.filter((item) => item !== photoRegion))} />Bu fotoğraf bu bölgeyi gösteriyor</label></div>)}
        {selectedPhoto !== -1 && <><figure><img src={previews[selectedPhoto]} alt={`${photoRegions[photoRegion].label} için seçilen fotoğraf`} /><button type="button" className="remove-photo" aria-label="Seçilen fotoğrafı kaldır" onClick={() => setFiles((previous) => previous.filter((entry) => entry.position !== photoRegion))}><XIcon /></button></figure><p className="photo-save-note" role="status">Seçildi, henüz kaydedilmedi. Taslağı kaydettiğinde yüklenir.</p></>}
        <input ref={photoInput} type="file" className="file-input" aria-label="Bölge için galeriden fotoğraf seç" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
        <input ref={cameraInput} type="file" className="file-input" aria-label="Bölge için fotoğraf çek" accept="image/*" capture="environment" onChange={choosePhoto} />
        {!cameraOpen && !photos.some((photo) => photo.position === photoRegion) && <div className="photo-source-actions"><button type="button" className="primary-button" onClick={() => { keyboard.hide(); setCameraOpen(true); }}><CameraIcon size={20} />{selectedPhoto === -1 ? "Fotoğraf çek" : "Yeniden çek"}</button><button type="button" className="secondary-button" onClick={() => { keyboard.hide(); photoInput.current?.click(); }}>{selectedPhoto === -1 ? "Galeriden seç" : "Fotoğrafı değiştir"}</button></div>}
        {cameraOpen && <PhotoCamera label={photoRegions[photoRegion].label} hint={photoRegions[photoRegion].hint} onClose={() => setCameraOpen(false)} onCapture={(file) => { setCameraOpen(false); acceptPhoto(file); }} onFallback={() => { setCameraOpen(false); cameraInput.current?.click(); }} />}
        <small>JPG, PNG veya WebP · fotoğraf başına en fazla 8 MB</small>
        {selectedPhoto !== -1 && nextPhotoRegion !== -1 && <button type="button" className="photo-next" onClick={() => setPhotoRegion(nextPhotoRegion)}>Sonraki eksik bölgeye geç <ArrowRightIcon size={16} /></button>}
      </div>
      <div className="photo-region-heading"><strong>Bölgeler</strong><span>Bir bölge seç</span></div>
      <div className="region-list sell-region-list" aria-label="Araç bölgeleri">{photoRegions.map((region, position) => <button type="button" key={region.label} className={position === photoRegion ? "region-step active" : "region-step"} aria-pressed={position === photoRegion} onClick={() => { setCameraOpen(false); setPhotoRegion(position); }}><span>{position + 1}</span><strong>{region.label}</strong><small>{files.some((item) => item.position === position) ? "Seçildi" : confirmedPhotos.includes(position) ? "Hazır" : photos.some((item) => item.position === position) ? "Kontrol et" : "Eksik"}</small></button>)}</div>
      <small>Fotoğrafların doğru bölgeyi gösterdiğini kontrol et; otomatik görüntü doğrulaması yapılmaz. Kayıtlı fotoğrafı değiştirmek için önce kaldır.</small>
      <small>Taslak fotoğrafları sana özeldir; ilanı yayımladığında herkese görünür. Konum metaverisi yüklemeden önce temizlenir.</small>
      </>}
      {step === 4 && <><div className="sell-intro"><h2>İlanını hazırla.</h2><p>Alıcıların ilk göreceği bilgileri ekle. Başlığın {makes.find((item) => item.id === makeId)?.name} {models.find((item) => item.id === modelId)?.name} ile uyumlu olduğundan emin ol.</p></div>
      <TextField label="İlan başlığı" value={fields.title} onChange={(value) => field("title", value)} maxLength={120} error={listingAttempted && fields.title.trim().length < 5 ? "En az 5 karakterlik bir başlık yaz." : undefined} />
      <TextField label="Fiyat (₺)" value={fields.price} onChange={(value) => field("price", value)} numeric maxLength={9} error={listingAttempted && (!/^\d+$/.test(fields.price) || Number(fields.price) <= 0) ? "Geçerli bir fiyatı noktasız yaz." : undefined} />
      {/^\d+$/.test(fields.price) && Number(fields.price) > 0 && <small>{money(Number(fields.price))}</small>}
      <div className="cloud-pair"><TextField label="İl" value={fields.city} onChange={(value) => field("city", value)} maxLength={60} error={listingAttempted && fields.city.trim().length < 2 ? "İl adını gir." : undefined} /><TextField label="İlçe" value={fields.district} onChange={(value) => field("district", value)} maxLength={80} /></div>
      <label className="cloud-field"><span>Açıklama · İsteğe bağlı</span><KeyboardTextarea aria-label="Açıklama" value={fields.description} onChange={(event) => field("description", event.target.value)} maxLength={5000} onBlur={() => keyboard.hide()} /></label></>}
      {step === 5 && <><div className="sell-intro"><h2>Son bir kontrol.</h2><p>İlanını gözden geçir, ardından taslak olarak kaydet veya yayımla.</p></div>
      <div className="sell-preview">{(photos.length > 0 || files.length > 0) && <div className="sell-photo-preview" aria-label="İlan fotoğrafları önizlemesi">{photoRegions.map((region, position) => { const index = files.findIndex((item) => item.position === position); const url = index !== -1 ? previews[index] : photos.find((photo) => photo.position === position)?.url; return url ? <img key={region.label} src={url} alt={`${region.label} fotoğrafı`} /> : null; })}</div>}<strong>{fields.title}</strong><b>{money(Number(fields.price) || 0)}</b><p>{makes.find((item) => item.id === makeId)?.name} {models.find((item) => item.id === modelId)?.name} · {fields.year} · {fields.mileage} km</p><p>{fields.body} · {fields.fuel} · {fields.transmission}</p><p>{[fields.district, fields.city].filter(Boolean).join(", ")}</p><small>{8 - missingPhotos.length} / 8 bölge hazır · Boya ve değişen bilgileri satıcı beyanıdır.</small></div>
      {!photosReady && <button type="button" className="sell-missing" onClick={() => setStep(3)}>Yayımlamak için 8 bölgenin fotoğrafını tamamla ve kayıtlı fotoğrafları onayla. Eksik veya kontrol bekleyen: {missingPhotos.map((region) => region.label).join(", ")}. Fotoğraflara dön →</button>}
      {!userId && <small>Kaydetmek veya yayımlamak için giriş yapman gerekecek. Seçtiğin fotoğraflar sayfa kapanırsa yeniden eklenmelidir.</small>}</>}
    </fieldset>
    {error && <p className="upload-error" role="alert">{error}</p>}{status && <p className="cloud-status" role="status">{status}</p>}
    {!initial && <small role="status">{storageError ? "Bilgiler yalnızca bu açık ekranda tutuluyor; cihazda geçici kayıt yapılamadı." : "Bilgilerin bu sekmede geçici tutulur; hesabına kaydetmek için taslağı kaydet."}</small>}
    <div className="sell-actions">{step > 0 && <button className="secondary-button" type="button" disabled={busy} onClick={() => { keyboard.hide(); setCameraOpen(false); setError(""); setStep(step - 1); }}>Geri</button>}
    {step < 5 ? <button className="primary-button" type="button" disabled={busy} onClick={nextStep}>Devam et<ArrowRightIcon size={19} /></button> : <><button className="primary-button" type={photosReady ? "submit" : "button"} disabled={busy} onClick={photosReady ? undefined : () => { setError(""); setStep(3); }}>{busy ? "Kaydediliyor…" : photosReady ? "İlanı yayımla" : "Fotoğrafları tamamla"}<ArrowRightIcon size={19} /></button><button className="secondary-button" type="button" disabled={busy} onClick={() => void persist(false)}>Taslağı kaydet</button></>}</div>
    <p className="cloud-credit">Vehicle data by <a href="https://vehiclesdb.com" target="_blank" rel="noreferrer">VehiclesDB</a> · <a href="/licenses/vehiclesdb-attribution.txt" target="_blank" rel="noreferrer">Kaynaklar ve lisans</a></p>
  </form>;
}

export default function CloudMarketplace({ activeTab, sellRequest, onNavigate, onDemo, onPreparePhotos }: Props) {
  const keyboard = useKeyboard();
  const [onboarding, setOnboarding] = useState(readOnboarding);
  const [setupStorageError, setSetupStorageError] = useState(false);
  useEffect(() => { try { localStorage.setItem(onboardingKey, JSON.stringify(onboarding)); setSetupStorageError(false); } catch { setSetupStorageError(true); } }, [onboarding]);
  const [session, setSession] = useState<Session | null>(null); const [authLoading, setAuthLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>(null); const [recovery, setRecovery] = useState(false); const [pendingSell, setPendingSell] = useState(false);
  const [search, setSearch] = useState<CloudSearch>(() => onboarding.appliedFilters ? { query: "", filters: { ...onboarding.appliedFilters } } : emptyCloudSearch); const [query, setQuery] = useState(""); const [filterDraft, setFilterDraft] = useState<Filters>({ ...defaults });
  const [feed, setFeed] = useState<Listing[]>([]); const [mine, setMine] = useState<Listing[]>([]); const [favorites, setFavorites] = useState<string[]>([]); const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]); const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null); const [editing, setEditing] = useState<Listing | null>(null);
  const [savedLoading, setSavedLoading] = useState(false); const [savedLoadError, setSavedLoadError] = useState(false);
  const [page, setPage] = useState(0); const [more, setMore] = useState(false); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0); const revisionRef = useRef(0); const userId = session?.user.id;
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data, error: failure }) => { if (live) { setSession(data.session); setAuthLoading(false); if (failure) setError(errorMessage(failure)); } }).catch((cause) => { if (live) { setAuthLoading(false); setError(errorMessage(cause)); } });
    const { data } = supabase.auth.onAuthStateChange((event, next) => { if (!live) return; setSession(next); setAuthLoading(false); if (event === "PASSWORD_RECOVERY") { setRecovery(true); setPanel("auth"); } });
    let removeListener: (() => void) | undefined;
    if (isNativeAndroid) {
      const handleUrl = async (url: string) => {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "com.sattimgitti.app:" || parsed.hostname !== "auth" || parsed.pathname !== "/callback") return;
          const code = parsed.searchParams.get("code");
          if (!code) throw new Error("Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
          const result = await supabase.auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        } catch (cause) { if (live) setError(errorMessage(cause)); }
      };
      void NativeApp.addListener("appUrlOpen", ({ url }) => { void handleUrl(url); }).then((listener) => { if (live) removeListener = () => { void listener.remove(); }; else void listener.remove(); });
      void NativeApp.getLaunchUrl().then((launch) => { if (live && launch?.url) void handleUrl(launch.url); });
    }
    return () => { live = false; removeListener?.(); data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let live = true; const current = ++revisionRef.current; setLoading(true); setError("");
    getListings(search, page).then((rows) => { if (live && current === revisionRef.current) { setFeed((previous) => page ? [...previous.filter((old) => !rows.some((row) => row.id === old.id)), ...rows] : rows); setMore(rows.length === pageSize); } }).catch((cause) => { if (live) setError(errorMessage(cause)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [search, page, revision, userId]);
  useEffect(() => { setMine([]); setFavorites([]); setSaved([]); setFavoriteListings([]); setSelected(null); if (!pendingSell) { setEditing(null); setPanel(null); } }, [userId]);
  useEffect(() => {
    let live = true;
    if (userId) { setSavedLoading(true); setSavedLoadError(false); Promise.all([getListings(emptyCloudSearch, 0, { ownerId: userId }), getFavorites(), getSavedSearches()]).then(async ([owned, ids, searches]) => { const favoriteRows = await getListings(emptyCloudSearch, 0, { ids }); if (live) { setMine(owned); setFavorites(ids); setSaved(searches); setFavoriteListings(favoriteRows); } }).catch((cause) => { if (live) { setSavedLoadError(true); setError(errorMessage(cause)); } }).finally(() => { if (live) setSavedLoading(false); }); } else { setSavedLoading(false); setSavedLoadError(false); }
    return () => { live = false; };
  }, [userId, revision]);
  useEffect(() => { keyboard.hide(); setSelected(null); setPanel(null); }, [activeTab]);
  useEffect(() => { if (recovery) setPanel("auth"); }, [recovery,userId]);
  useEffect(() => { if (sellRequest) { keyboard.hide(); setEditing(null); setPendingSell(false); setPanel("editor"); } }, [sellRequest]);
  useEffect(() => { if (userId && pendingSell) { try { sessionStorage.removeItem("sattim-gitti-sell-auth"); } catch { /* Storage unavailable. */ } setPendingSell(false); setPanel("editor"); } }, [userId, pendingSell]);
  useEffect(() => { if (!authLoading && userId) { try { if (sessionStorage.getItem("sattim-gitti-sell-auth") && readSellDraft()) { sessionStorage.removeItem("sattim-gitti-sell-auth"); setPanel("editor"); } } catch { /* Storage unavailable. */ } } }, [authLoading, userId]);
  function refresh() { setPage(0); setRevision((value) => value + 1); }
  function requireLogin() { keyboard.hide(); if (!userId) { setPanel("auth"); return false; } return true; }
  async function openListing(id: string) { keyboard.hide(); setBusy(true); setError(""); try { setSelected(await getListing(id)); setPanel("detail"); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }
  async function favorite(id: string) { if (!requireLogin() || busy) return; setBusy(true); try { await toggleFavorite(id, favorites.includes(id)); const ids = await getFavorites(); setFavorites(ids); setFavoriteListings(await getListings(emptyCloudSearch, 0, { ids })); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }
  function applySearch(next: CloudSearch) { keyboard.hide(); setQuery(next.query); setSearch(next); setPage(0); setPanel(null); setError(""); onNavigate("explore"); }
  async function follow() { if (!requireLogin() || busy) return; setBusy(true); try { await saveSearch(search); setSaved(await getSavedSearches()); setNotice("Araman hesabına kaydedildi."); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }
  function finishOnboarding(intent: OnboardingState["intent"]) {
    keyboard.hide(); setOnboarding((previous) => ({ ...previous, completed: true, intent, appliedFilters: intent === "buy" ? { ...previous.filters } : intent === "browse" ? null : previous.appliedFilters }));
    if (intent === "buy") { applySearch({ query: "", filters: { ...onboarding.filters } }); setNotice("Araman hazır. İstersen hesabına kaydedebilirsin."); }
    else if (intent === "sell") { setEditing(null); setPendingSell(false); setPanel("editor"); }
    else { applySearch({ query: "", filters: { ...defaults } }); }
  }
  function skipOnboarding() { keyboard.hide(); setOnboarding((previous) => ({ ...previous, completed: true, intent: "browse" })); setPanel(null); }
  function card(listing: Listing, own = false) {
    const reasons = !own && activeTab === "explore" ? explainMatch(listing, search) : null;
    const paint = listing.paint === "none" ? "Boyasız" : listing.paint === "present" ? "Boya var" : "Boya bilinmiyor";
    const replacement = listing.replacement === "none" ? "Değişensiz" : listing.replacement === "present" ? "Değişen var" : "Değişen bilinmiyor";
    return <article className="market-listing cloud-listing" key={listing.id} data-listing-id={listing.id}>
      <div className="market-listing-visual">
        <button className="market-listing-image" aria-label={`${listing.title} ilanını incele, ${listing.year}, ${listing.mileage.toLocaleString("tr")} kilometre`} onClick={() => void openListing(listing.id)}>{listing.photos[0]?.url ? <img src={listing.photos[0].url} alt={listing.title} draggable={false} /> : <span className="cloud-no-photo"><CameraIcon size={28} />Fotoğraf eklenmedi</span>}<span className="cloud-card-mileage">{listing.mileage.toLocaleString("tr")} km</span><span className="cloud-card-year">{listing.year}</span></button>
        <button className="card-favorite icon-button" aria-label={favorites.includes(listing.id) ? "Favorilerden çıkar" : "Favorilere ekle"} aria-pressed={favorites.includes(listing.id)} disabled={busy || listing.status !== "published"} onClick={() => void favorite(listing.id)}><HeartIcon size={23} weight={favorites.includes(listing.id) ? "fill" : "regular"} /></button>
      </div>
      <button className="market-listing-info" onClick={() => void openListing(listing.id)}>
        {own && <span className="market-example">{listing.status === "published" ? "Yayında" : listing.status === "draft" ? "Taslak · Sana özel" : "Yayından kaldırıldı"}</span>}
        <div className="cloud-card-head"><strong>{money(listing.price)}</strong><span>{listing.transmission}</span></div>
        <h3>{listing.title}</h3>
        <p>{listing.make_name} {listing.model_name}</p>
        <div className="cloud-card-condition"><small>Satıcı beyanı</small><div className="cloud-card-pills"><span>{paint}</span><span>{replacement}</span></div></div>
        <span><MapPinIcon size={12} />{listing.district ? `${listing.district}, ` : ""}{listing.city}</span>
      </button>
      {reasons && reasons.matched.length > 0 && <div className="cloud-match-summary"><strong>Neden sana uygun?</strong><p>{reasons.matched.slice(0, 3).join(" · ")}</p>{reasons.missing.length > 0 && <small>Bazı tercihlerinle eşleşmiyor; ayrıntıları incele.</small>}</div>}
    </article>;
  }
  const activeFilters = filterGroups.flatMap((group) => { const value = search.filters[group.key]; const label = group.options.find(([option]) => option === value)?.[1]; return value !== "any" && label ? [{ key: group.key, label: `${group.label}: ${label}` }] : []; });
  const owned = selected && mine.some((listing) => listing.id === selected.id);
  const selectedMatch = selected ? explainMatch(selected, search) : null;
  const localDraft = readSellDraft();
  if (activeTab === "listing") return null;
  return <>
    <MobileScroll key={activeTab} className="market-scroll"><main className="market-content cloud-content app-content-enter" onClickCapture={(event) => { if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) keyboard.hide(); }}>
      {activeTab === "explore" && <><div className="market-heading promise-heading"><span className="eyebrow">BİR SONRAKİ ARACIN</span><h1>Sen arama,<span>biz senin için takip edelim.</span></h1><p>Yayımlanan araçları keşfet ve aramanı kaydet. Otomatik takip henüz bağlı değil.</p></div>{!onboarding.completed && <section className="onboarding-welcome" aria-labelledby="onboarding-welcome-title"><div><span className="eyebrow">SANA ÖZEL BİR BAŞLANGIÇ</span><h2 id="onboarding-welcome-title">Sana nasıl yardımcı olalım?</h2><p>Bütçeni ve tercihlerini belirle, sana uygun ilanlarla başla.</p></div><div className="onboarding-welcome-actions"><button className="onboarding-start" onClick={() => { keyboard.hide(); setPanel("onboarding"); }}>{onboarding.step > 0 ? "Kuruluma devam et" : "Başlayalım"}<ArrowRightIcon size={17} /></button><button className="market-text-button" onClick={skipOnboarding}>Şimdilik atla</button></div></section>}{localDraft?.modelId && <button className="sell-resume" onClick={() => { keyboard.hide(); setEditing(null); setPendingSell(false); setPanel("editor"); }}><CarIcon size={22} /><span><strong>İlanına kaldığın yerden devam et</strong><small>Araç bilgilerin bu sekmede tutuluyor. Kaydedilmemiş fotoğrafları yeniden ekle.</small></span><ArrowRightIcon size={18} /></button>}{setupStorageError && <p className="market-data-note" role="status">Tercihlerin bu açık ekranda uygulanır; cihazda saklanamadı.</p>}<form className="market-search" onSubmit={(event) => { event.preventDefault(); applySearch({ ...search, query }); }}><div className="market-search-input"><KeyboardInput aria-label="Marka, model veya kelime ara" placeholder="Marka, model veya kelime" value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => keyboard.hide()} /><button className="cloud-search-submit" type="submit" aria-label="Araç ara"><MagnifyingGlassIcon size={20} /></button></div><button className="market-filter-button" type="button" aria-label="Filtreler" onClick={() => { keyboard.hide(); setFilterDraft({ ...search.filters }); setPanel("filters"); }}><SlidersHorizontalIcon size={20} /><span className="cloud-filter-label">Filtrele</span></button></form>{activeFilters.length > 0 && <div className="cloud-active-filters" aria-label="Uygulanan filtreler">{activeFilters.map(({ key, label }) => <button key={key} type="button" aria-label={`${label} filtresini kaldır`} onClick={() => applySearch({ ...search, filters: { ...search.filters, [key]: "any" } })}>{label} <XIcon size={14} /></button>)}</div>}<div className="market-section-heading"><h2>Yayımlanan ilanlar</h2><button disabled={loading} onClick={refresh}>Yenile</button></div><button className="market-text-button" disabled={busy} onClick={() => void follow()}><BookmarkSimpleIcon size={18} />Bu aramayı kaydet</button>{feed.map((listing) => card(listing))}{!loading && !feed.length && !error && <div className="cloud-empty"><MagnifyingGlassIcon size={30} /><h3>Henüz eşleşen ilan yok.</h3><p>Başka kelime veya filtrelerle tekrar deneyebilirsin. Yeni yayımlanan ilanlar burada görünür.</p>{(activeFilters.length > 0 || search.query.trim()) && <button className="secondary-button" onClick={() => applySearch({ query: "", filters: { ...defaults } })}>Aramayı ve filtreleri temizle</button>}</div>}{more && <button className="secondary-button" disabled={loading} onClick={() => setPage((value) => value + 1)}>Daha fazla ilan</button>}<p className="market-data-note">Boya ve değişen bilgileri satıcı beyanıdır; ekspertiz doğrulaması değildir. Otomatik bildirim gönderimi henüz bağlı değil.</p></>}
      {(activeTab === "favorites" || activeTab === "tracking") && <><SavedHeader activeTab={activeTab} onNavigate={onNavigate} />
        {authLoading || (userId && savedLoading) ? <p className="cloud-status" role="status">Kaydedilenler yükleniyor…</p> : savedLoadError && userId ? <div className="saved-empty"><h2>Kaydedilenler yüklenemedi.</h2><p>Bağlantını kontrol edip tekrar dene.</p><button className="secondary-button" onClick={refresh}>Tekrar dene</button></div> : !userId ? <div className="saved-empty"><span className="saved-empty-icon"><BookmarkSimpleIcon size={27} weight="light" /></span><h2>Kaydettiklerin hep yanında.</h2><p>Beğendiğin araçları ve aramalarını hesabında saklamak için giriş yap.</p><button className="primary-button" onClick={() => setPanel("auth")}>Giriş yap / hesap oluştur<ArrowRightIcon size={18} /></button><button className="market-text-button" onClick={() => onNavigate("explore")}>Araçları keşfet</button></div> : activeTab === "favorites" ? favoriteListings.length ? <>{favoriteListings.map((listing) => card(listing))}<p className="market-data-note">Yayından kaldırılan ilanlar burada gösterilmez.</p></> : <div className="saved-empty"><span className="saved-empty-icon"><HeartIcon size={27} weight="light" /></span><h2>Beğendiğin araçları kaydet.</h2><p>İlanlardaki kalbe dokun; araçlar burada seni beklesin.</p><button className="secondary-button" onClick={() => onNavigate("explore")}>Araçları keşfet<ArrowRightIcon size={18} /></button></div> : <>{saved.length ? saved.map((item) => <article className="cloud-saved" key={item.id}><button onClick={() => applySearch(item.criteria)}><BookmarkSimpleIcon size={23} /><span><strong>{item.name}</strong><small>Aramayı aç</small></span><ArrowRightIcon size={18} /></button><button className="icon-button" aria-label={`${item.name} aramasını sil`} disabled={busy} onClick={async () => { setBusy(true); try { await removeSearch(item.id); setSaved(await getSavedSearches()); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }}><XIcon size={18} /></button></article>) : <div className="saved-empty"><span className="saved-empty-icon"><MagnifyingGlassIcon size={27} weight="light" /></span><h2>Aramanı bir kez kaydet.</h2><p>Arama kriterlerini kaydet; daha sonra kaldığın yerden aç.</p><button className="secondary-button" onClick={() => onNavigate("explore")}>Araçları keşfet<ArrowRightIcon size={18} /></button></div>}<p className="market-data-note">Aramalar saklanır; otomatik tarama, fiyat alarmı ve bildirim gönderimi henüz bağlı değil.</p></>}
      </>}
      {activeTab === "account" && <div className="account-page">
        <div className="account-heading"><span>HESAP</span><h1>Hesabım</h1><p>İlanlarını ve hesap işlemlerini buradan yönet.</p></div>
        <section className="account-profile" aria-label="Hesap bilgileri">
          <div className="account-profile-top"><span className="account-avatar"><UserIcon size={25} weight="light" /></span><div><span className="account-profile-label">{authLoading ? "OTURUM" : userId ? "HESABIN" : "MİSAFİR"}</span><strong>{authLoading ? "Oturum kontrol ediliyor…" : userId ? session?.user.email : "Hoş geldin"}</strong><p>{userId ? "Hesabınla giriş yaptın." : "İlanları giriş yapmadan inceleyebilirsin."}</p></div></div>
          {!userId && <button className="primary-button" disabled={authLoading} onClick={() => { setPendingSell(false); setPanel("auth"); }}>Giriş yap / hesap oluştur<ArrowRightIcon size={19} /></button>}
        </section>
        {userId && <section className="account-section" aria-labelledby="account-listings-title">
          <div className="account-section-heading"><div><span>ARAÇLARIM</span><h2 id="account-listings-title">İlanlarım</h2></div></div>
          {savedLoading ? <p className="account-listings-message" role="status">İlanların yükleniyor…</p> : savedLoadError ? <div className="account-listings-message">İlanların yüklenemedi. Bağlantını kontrol edip tekrar dene.<button className="market-text-button" onClick={refresh}>Tekrar dene</button></div> : mine.length ? <>{mine.map((listing) => card(listing, true))}{mine.length % pageSize === 0 && <button className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); try { const rows = await getListings(emptyCloudSearch, Math.floor(mine.length/pageSize), { ownerId: userId }); setMine((previous) => [...previous,...rows]); } catch(cause) { setError(errorMessage(cause)); } finally {setBusy(false);} }}>Diğer ilanlarım</button>}</> : <div className="account-empty"><span><CarIcon size={24} weight="light" /></span><div><strong>Henüz ilanın yok</strong><p>İlk ilanını oluşturmak için yukarıdaki “Araç sat” seçeneğini kullan.</p></div></div>}
        </section>}
        <section className="account-section" aria-labelledby="account-tools-title"><div className="account-section-heading"><div><span>KEŞFET</span><h2 id="account-tools-title">Senin için</h2></div></div><div className="account-menu">
          <button className="account-row" onClick={() => { keyboard.hide(); setOnboarding((previous) => ({ ...previous, completed: false, step: 0, filters: { ...search.filters } })); setPanel("onboarding"); }}><span className="account-row-icon"><SlidersHorizontalIcon size={20} /></span><span className="account-row-copy"><strong>Başlangıç tercihlerim</strong><small>Bütçeni, konumunu ve araç tercihlerini düzenle</small></span><CaretRightIcon size={17} /></button>
          <button className="account-row" onClick={() => { keyboard.hide(); onPreparePhotos(); }}><span className="account-row-icon"><CameraIcon size={20} /></span><span className="account-row-copy"><strong>Fotoğraflarını hazırla</strong><small>Cihazındaki fotoğraf aracı</small></span><CaretRightIcon size={17} /></button>
          <button className="account-row" onClick={onDemo}><span className="account-row-icon"><CompassIcon size={20} /></span><span className="account-row-copy"><strong>Örnek deneyimi incele</strong><small>Karşılaştırma ve satış rehberi</small></span><CaretRightIcon size={17} /></button>
        </div></section>
        <section className="account-section" aria-labelledby="account-settings-title"><div className="account-section-heading"><div><span>HESAP VE GİZLİLİK</span><h2 id="account-settings-title">Ayarlar</h2></div></div><div className="account-menu">
          <a className="account-row" href="https://freckle-monitor-98d.notion.site/Satt-m-Gitti-Gizlilik-Politikas-40940f663608811a8eb8d59d26cfccb0"><span className="account-row-icon"><ShieldCheckIcon size={20} /></span><span className="account-row-copy"><strong>Gizlilik politikası</strong><small>Verilerinin nasıl işlendiğini öğren</small></span><CaretRightIcon size={17} /></a>
          <a className="account-row" href="mailto:enes.gok@metu.edu.tr?subject=Satt%C4%B1m%20Gitti%20hesap%20silme%20talebi"><span className="account-row-icon"><TrashIcon size={20} /></span><span className="account-row-copy"><strong>Hesabımı ve verilerimi sil</strong><small>Silme talebini e-posta ile ilet</small></span><CaretRightIcon size={17} /></a>
          {userId && <button className="account-row" disabled={busy} onClick={async () => { setBusy(true); try { const { error: failure } = await supabase.auth.signOut(); if (failure) throw failure; setNotice("Çıkış yapıldı."); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }}><span className="account-row-icon"><SignOutIcon size={20} /></span><span className="account-row-copy"><strong>Çıkış yap</strong><small>Bu cihazdaki oturumunu kapat</small></span><CaretRightIcon size={17} /></button>}
        </div></section>
      </div>}
      {loading && <p className="cloud-status" role="status">İlanlar yükleniyor…</p>}{error && <div className="upload-error" role="alert">{error}<button className="market-text-button" onClick={refresh}>Tekrar dene</button></div>}{notice && <p className="cloud-status" role="status">{notice}</p>}
    </main></MobileScroll>
    <BottomSheet open={panel !== null} onOpenChange={(open) => { if (!open && !busy) { keyboard.hide(); setPanel(null); setPendingSell(false); setRecovery(false); try { sessionStorage.removeItem("sattim-gitti-sell-auth"); } catch { /* Storage unavailable. */ } } }} title={panel === "onboarding" ? "Sana uygun bir başlangıç." : panel === "auth" ? "Hesabınla devam et." : panel === "editor" ? "Aracını ilana ekle." : panel === "filters" ? "Aramanı daralt." : selected?.title ?? "İlan"} description={panel === "editor" ? "Önce taslak, hazır olduğunda yayında." : panel === "auth" ? "İlan vermek ve seçimlerini kaydetmek için giriş yap." : undefined} snap={.94}>
      <button className="sheet-close icon-button" disabled={busy} aria-label="Paneli kapat" onClick={() => { keyboard.hide(); setPanel(null); setPendingSell(false); setRecovery(false); try { sessionStorage.removeItem("sattim-gitti-sell-auth"); } catch { /* Storage unavailable. */ } }}><XIcon size={20} /></button>
      {panel === "onboarding" && <><Onboarding value={onboarding} onChange={(value) => { keyboard.hide(); setOnboarding(value); }} onFinish={finishOnboarding} onSkip={skipOnboarding} />{setupStorageError && <p className="upload-error" role="status">Tercihlerin bu açık ekranda uygulanır; cihazda saklanamadı.</p>}</>}
      {panel === "auth" && <AuthForm recovery={recovery} onDone={() => { setPanel(pendingSell ? "editor" : null); setRecovery(false); }} />}
      {(panel === "editor" || (panel === "auth" && pendingSell)) && <div hidden={panel !== "editor"}><DraftForm key={editing?.id ?? "new"} initial={editing} userId={userId} onAuth={() => { try { sessionStorage.setItem("sattim-gitti-sell-auth", "1"); } catch { /* Storage unavailable. */ } setPendingSell(true); setPanel("auth"); }} onBusy={setBusy} onChanged={refresh} onDone={(listing) => { setNotice(listing.status === "published" ? "İlanın yayımlandı. Diğer kullanıcılar artık görebilir." : "Taslağın hesabına kaydedildi; yalnızca sana görünür."); setPanel(null); setSelected(null); onNavigate("account"); refresh(); }} /></div>}
      {panel === "filters" && <div className="market-filters app-content-enter">{filterGroups.map((group) => <fieldset key={group.key}><legend>{group.label}</legend><div className="filter-options">{group.options.map(([value,label]) => <button key={value} aria-pressed={filterDraft[group.key] === value} onClick={() => setFilterDraft((previous) => ({ ...previous,[group.key]:value }))}>{label}</button>)}</div></fieldset>)}<p className="market-data-note">Boyasız/değişensiz filtresi yalnızca bu yöndeki satıcı beyanlarıyla eşleşir. Bilinmeyen bilgiler eşleşmiş sayılmaz.</p><button className="secondary-button" onClick={() => setFilterDraft({ ...defaults })}>Filtreleri sıfırla</button><button className="primary-button" onClick={() => applySearch({ query, filters: filterDraft })}>Sonuçları göster<ArrowRightIcon size={19} /></button></div>}
      {panel === "detail" && selected && <div className="cloud-detail app-content-enter">
        {selected.photos.length > 0 && <Carousel className="cloud-gallery" ariaLabel="İlan fotoğrafları" contentClassName="cloud-gallery-track">{selected.photos.map((photo, index) => <img key={photo.id} src={photo.url} alt={`${selected.title}, fotoğraf ${index + 1}`} draggable={false} />)}</Carousel>}
        {selected.photos.length > 1 && <p className="cloud-gallery-hint">{selected.photos.length} fotoğraf · Görmek için kaydır</p>}
        <section className="cloud-detail-intro" aria-label="İlan özeti">
          <p className="cloud-detail-make">{selected.make_name} {selected.model_name}</p>
          <div className="listing-price"><strong>{money(selected.price)}</strong></div>
          <p className="cloud-detail-location"><MapPinIcon size={17} />{[selected.district, selected.city].filter(Boolean).join(", ")}</p>
        </section>
        {selectedMatch && (selectedMatch.matched.length > 0 || selectedMatch.missing.length > 0) && <section className="cloud-detail-section cloud-match-detail" aria-labelledby="cloud-match-title"><h3 id="cloud-match-title">Aramana göre</h3>{selectedMatch.matched.length > 0 && <><h4>Eşleşen tercihler</h4><ul>{selectedMatch.matched.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}{selectedMatch.missing.length > 0 && <><h4>Kontrol etmen gerekenler</h4><ul>{selectedMatch.missing.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}<p>İlan bilgilerine göre karşılaştırılır; araç veya ekspertiz doğrulaması değildir.</p></section>}
        <section className="cloud-detail-section" aria-labelledby="cloud-highlights-title">
          <h3 id="cloud-highlights-title">Araca genel bakış</h3>
          <dl className="cloud-highlights">
            {[
              { label: "Model yılı", value: selected.year, Icon: CalendarBlankIcon },
              { label: "Kilometre", value: `${selected.mileage.toLocaleString("tr")} km`, Icon: GaugeIcon },
              { label: "Vites", value: selected.transmission, Icon: GearSixIcon },
              { label: "Yakıt", value: selected.fuel, Icon: GasPumpIcon },
            ].map(({ label, value, Icon }) => <div key={label}><Icon size={21} aria-hidden="true" /><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <p className="cloud-body-type"><span>Kasa tipi</span><strong>{selected.body}</strong></p>
        </section>
        <section className="cloud-detail-section cloud-condition" aria-labelledby="cloud-condition-title">
          <div className="cloud-section-heading"><h3 id="cloud-condition-title">Araç durumu</h3><span>Satıcı beyanı</span></div>
          <dl className="cloud-condition-grid">
            <div><dt>Boya</dt><dd>{selected.paint === "unknown" ? "Bilinmiyor" : selected.paint === "none" ? "Boyasız" : "Boya var"}</dd></div>
            <div><dt>Değişen parça</dt><dd>{selected.replacement === "unknown" ? "Bilinmiyor" : selected.replacement === "none" ? "Değişensiz" : "Var"}</dd></div>
          </dl>
          <p>Bu bilgiler satıcı tarafından girildi; bağımsız doğrulama yapılmadı.</p>
        </section>
        <section className="cloud-detail-section cloud-description-section" aria-labelledby="cloud-description-title">
          <h3 id="cloud-description-title">Açıklama</h3>
          <p className="cloud-description">{selected.description || "Açıklama eklenmedi."}</p>
        </section>
        <p className="cloud-detail-disclaimer">İlan bilgileri satıcı tarafından girildi; bağımsız doğrulama yapılmadı.</p>{!owned && <p className="cloud-status">Satıcıyla iletişim henüz uygulamada kullanılamıyor. İlanı kaydederek daha sonra bulabilirsin.</p>}
        {owned ? <><p className="cloud-status">{selected.status === "published" ? "İlanın yayında." : "Bu ilan yalnızca sana görünüyor."}</p><button className="primary-button" disabled={busy} onClick={async () => { setBusy(true); try { if (selected.status !== "draft") await setListingStatus(selected.id,"draft"); const listing = await getListing(selected.id); setEditing(listing); setPanel("editor"); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }}> {selected.status === "published" ? "Taslağa al ve düzenle" : "Düzenle / yayımla"}</button>{selected.status === "published" && <button className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); try { await setListingStatus(selected.id,"archived"); setPanel(null); setNotice("İlan yayından kaldırıldı."); refresh(); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }}>Yayından kaldır</button>}</> : <button className="primary-button" disabled={busy} onClick={() => void favorite(selected.id)}><HeartIcon size={20} />{favorites.includes(selected.id) ? "Favorilerden çıkar" : "Favorilere ekle"}</button>}{error && <p className="upload-error" role="alert">{error}</p>}</div>}
    </BottomSheet>
  </>;
}
