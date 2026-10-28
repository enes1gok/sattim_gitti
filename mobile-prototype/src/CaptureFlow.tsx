import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowRightIcon, CameraIcon, CaretRightIcon, CheckIcon, CheckCircleIcon, CircleNotchIcon, CubeIcon, DownloadSimpleIcon, ImagesIcon, TrashIcon } from "@phosphor-icons/react";
import { ANGLES, PASSES, SHOTS_PER_SECTION, MAX_CAPTURE_PHOTOS, MAX_PHOTO_BYTES, MAX_SCAN_BYTES, captureCompletion, sectionCounts, validateCapture } from "./capture-policy";
import { readCaptureDraft, saveCaptureDraft, type StoredCapture } from "./capture-storage";
import { checkReconstruction, startReconstruction, getReconstruction, removeReconstruction, loadReconstruction, type ReconstructionJob, type ServiceStatus } from "./reconstruction-client";
import { validateModelFile } from "./model-file";
import CaptureCamera from "./CaptureCamera";

type CapturePhoto = StoredCapture & { url: string };

async function inspectPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("JPG veya PNG fotoğraf seç. HEIC fotoğrafları önce JPG olarak dışa aktar.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Her fotoğraf en fazla 12 MB olabilir.");
  const image = await createImageBitmap(file);
  try {
    if (Math.min(image.width, image.height) < 900 || Math.max(image.width, image.height) < 1600) throw new Error("Daha yüksek çözünürlük gerekli: en az 1600 × 900 piksel.");
    if (image.width * image.height > 80_000_000) throw new Error("Fotoğraf çok büyük. 80 megapikselden küçük bir JPG seç.");
    const canvas = document.createElement("canvas");
    canvas.width = 192; canvas.height = 128;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return "";
    context.drawImage(image, 0, 0, 192, 128);
    const pixels = context.getImageData(0, 0, 192, 128).data;
    const gray = new Float32Array(192 * 128);
    let clipped = 0, gradient = 0;
    for (let i = 0; i < gray.length; i++) { const p = i * 4; gray[i] = pixels[p] * .299 + pixels[p + 1] * .587 + pixels[p + 2] * .114; if (gray[i] < 12 || gray[i] > 245) clipped++; }
    for (let y = 1; y < 127; y++) for (let x = 1; x < 191; x++) { const i = y * 192 + x; gradient += Math.abs(gray[i] - gray[i + 1]) + Math.abs(gray[i] - gray[i + 192]); }
    if (clipped / gray.length > .6) return "Işığı kontrol et";
    if (gradient / (190 * 126 * 2) < 2) return "Netliği kontrol et";
    return "";
  } finally { image.close(); }
}

export function useCaptureSession() {
  const [photos, setPhotos] = useState<CapturePhoto[]>([]);
  const [job, setJob] = useState<ReconstructionJob | null>(null);
  const [jobId, setJobId] = useState<string>();
  const [restored, setRestored] = useState(false);
  const [durable, setDurable] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [service, setService] = useState<ServiceStatus | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const urls = useRef(new Set<string>());
  const lock = useRef(false);
  const upload = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void readCaptureDraft().then((draft) => {
      if (disposed) return;
      setPhotos(draft.photos.map((photo) => { const url = URL.createObjectURL(photo.file); urls.current.add(url); return { ...photo, url }; }));
      setJobId(draft.jobId);
    }).catch(() => { if (!disposed) setDurable(false); }).finally(() => { if (!disposed) setRestored(true); });
    return () => { disposed = true; mounted.current = false; upload.current?.abort(); urls.current.forEach(URL.revokeObjectURL); urls.current.clear(); };
  }, []);
  useEffect(() => {
    if (!restored) return;
    void saveCaptureDraft({ photos: photos.map(({ url: _, ...photo }) => photo), jobId }).catch(() => setDurable(false));
  }, [photos, jobId, restored]);
  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await getReconstruction(jobId, controller.signal);
        if (controller.signal.aborted) return;
        setJob(next); setConnectionLost(false);
        if (next.status === "ready" || next.status === "failed") return;
      } catch (reason) {
        if (controller.signal.aborted) return;
        if ([404, 410].includes((reason as { status?: number }).status ?? 0)) {
          setJobId(undefined); setJob(null); setError("Sunucudaki tarama artık yok. Cihazındaki çekimlerle yeniden oluşturabilirsin."); return;
        }
        setConnectionLost(true);
      }
      timer = setTimeout(poll, 2500);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [jobId]);

  async function refreshService() { setService(await checkReconstruction()); }
  async function add(files: File[], angle: number, pass: number) {
    if (lock.current || jobId) return;
    lock.current = true; setBusy(true); setError("");
    const next: CapturePhoto[] = [];
    const errors: string[] = [];
    const hashes = new Set(photos.map((photo) => photo.hash));
    let totalBytes = photos.reduce((sum, photo) => sum + photo.file.size, 0);
    try {
      for (const file of files) {
        if (photos.length + next.length >= MAX_CAPTURE_PHOTOS) { errors.push("En fazla 160 fotoğraf ekleyebilirsin."); break; }
        try {
          if (totalBytes + file.size > MAX_SCAN_BYTES) throw new Error("Bu tarama en fazla 512 MB olabilir.");
          const warning = await inspectPhoto(file);
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
          if (hashes.has(hash)) throw new Error("Aynı fotoğraf zaten var; farklı bir kare ekle.");
          hashes.add(hash); totalBytes += file.size;
          const url = URL.createObjectURL(file); urls.current.add(url);
          next.push({ id: crypto.randomUUID(), file, url, hash, warning, angle, pass });
        } catch (reason) { errors.push(reason instanceof Error ? reason.message : "Fotoğraf açılamadı."); }
      }
      if (mounted.current) { setPhotos((current) => [...current, ...next]); setError([...new Set(errors)].join(" ")); }
    } finally { lock.current = false; setBusy(false); }
  }
  function remove(id: string) {
    if (busy || jobId) return;
    const photo = photos.find((item) => item.id === id);
    if (photo) { URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); }
    setPhotos((current) => current.filter((item) => item.id !== id)); setError("");
  }
  async function generate() {
    if (lock.current || jobId) return;
    try { validateCapture(photos); } catch (reason) { setError((reason as Error).message); return; }
    lock.current = true; setUploading(true); setError("");
    const controller = new AbortController(); upload.current = controller;
    try {
      const next = await startReconstruction(photos, controller.signal);
      setJob(next); setJobId(next.id);
    } catch (reason) { setError(controller.signal.aborted ? "Gönderim iptal edildi. Çekimlerin korundu." : reason instanceof Error ? reason.message : "Servise ulaşılamadı. Çekimlerin korundu."); }
    finally { lock.current = false; setUploading(false); upload.current = null; }
  }
  async function edit(clear = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (jobId) await removeReconstruction(jobId);
      setJobId(undefined); setJob(null); setConnectionLost(false);
      if (clear) { urls.current.forEach(URL.revokeObjectURL); urls.current.clear(); setPhotos([]); }
    } catch { setError("Sunucudaki tarama kaldırılamadı. Servis bağlantısını kontrol et."); }
    finally { lock.current = false; setBusy(false); }
  }
  return { photos, job, jobId, restored, durable, error, setError, busy, uploading, service, connectionLost, refreshService, add, remove, generate, edit, cancelUpload: () => upload.current?.abort() };
}

type Props = { session: ReturnType<typeof useCaptureSession>; onModel: (buffer: ArrayBuffer) => void };
export default function CaptureFlow({ session: s, onModel }: Props) {
  const [step, setStep] = useState<"intro" | "capture" | "review">("intro");
  const [angle, setAngle] = useState(0);
  const [pass, setPass] = useState(0);
  const [checked, setChecked] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [opening, setOpening] = useState(false);
  const [liveCamera, setLiveCamera] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const selection = useRef({ angle: 0, pass: 0 });
  const flowRoot = useRef<HTMLDivElement>(null);
  useEffect(() => { void s.refreshService(); }, []);
  const completed = captureCompletion(s.photos);
  const counts = sectionCounts(s.photos, pass);
  const selected = s.photos.filter((photo) => photo.angle === angle && photo.pass === pass);
  const warnings = s.photos.filter((photo) => photo.warning).length;
  const processing = !!s.jobId && s.job?.status !== "failed" && s.job?.status !== "ready";
  const locked = s.busy || s.uploading || !!s.jobId || !s.restored;
  const phase = s.jobId ? "job" : step;
  useEffect(() => { flowRoot.current?.closest(".sheet-content")?.scrollTo(0, 0); }, [phase, angle, pass]);
  function choose(input: HTMLInputElement | null) { selection.current = { angle, pass }; input?.click(); }
  async function added(event: ChangeEvent<HTMLInputElement>) { const files = Array.from(event.target.files ?? []); event.target.value = ""; setChecked(false); await s.add(files, selection.current.angle, selection.current.pass); }
  async function openModel(download = false) {
    if (!s.jobId) return;
    setOpening(true); s.setError("");
    try {
      const buffer = await loadReconstruction(s.jobId); validateModelFile(buffer);
      if (download) { const url = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "aracim-3d.glb"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
      else onModel(buffer);
    } catch (reason) { s.setError(reason instanceof Error ? reason.message : "Model açılamadı."); }
    finally { setOpening(false); }
  }
  return <div className="scan-flow" ref={flowRoot}>
    <div className="scan-steps" aria-label="Tarama adımları">{["Çekim", "Kontrol", "3D model"].map((label, index) => <span key={label} className={(phase === "job" ? 2 : phase === "review" ? 1 : 0) === index ? "active" : ""}><small>{index + 1}</small>{label}</span>)}</div>
    {phase === "intro" && <>
      <div className="scan-intro-visual"><img src="/assets/car-top.png" alt="Çekim için aracın çevresinde iki tur ilerle" /><span className="scan-orbit-label"><CameraIcon size={19} />360°</span></div>
      <div className="scan-heading"><span className="eyebrow">SENİN ARACIN · GERÇEK ÇEKİM</span><h2>Çevresinde dolaş.<br />Her açısını yakala.</h2><p>İki tur, sekiz yön. Her bölümde en az dört ardışık fotoğraf.</p></div>
      <ul className="scan-tips"><li><CheckIcon size={18} /><span>Aracı sabit, kapıları kapalı tut.</span></li><li><CheckIcon size={18} /><span>Dağınık gün ışığı seç; flaş ve sert yansımadan kaçın.</span></li><li><CheckIcon size={18} /><span>Yavaş ilerle; komşu karelerin yaklaşık %70’i örtüşsün.</span></li></ul>
      <button className="primary-button" disabled={!s.restored} onClick={() => setStep("capture")}><CameraIcon size={22} />{!s.restored ? "Çekimlerin açılıyor…" : s.photos.length ? "Çekime devam et" : "Çekime başla"}<ArrowRightIcon size={20} /></button>
      <p className="scan-privacy">Çekim taslağın bu tarayıcıda saklanır. “3D model oluştur” dediğinde yalnızca bu Mac’te işlenir.</p>
    </>}
    {phase === "capture" && <>
      <div className="scan-capture-heading"><div><span className="eyebrow">{pass + 1}. TUR / 2</span><h2>{PASSES[pass]}</h2></div><strong>{completed}<small> / 64</small></strong></div>
      <div className="scan-progress" role="progressbar" aria-label="Planlanan çekimlerin tamamlanması" aria-valuenow={completed} aria-valuemax={64}><span style={{ width: `${completed / 64 * 100}%` }} /></div>
      <div className="scan-pass-switch" role="group" aria-label="Çekim turu">{PASSES.map((label, index) => <button key={label} aria-pressed={pass === index} className={pass === index ? "active" : ""} onClick={() => { setPass(index); setAngle(0); }} disabled={locked}>{label}</button>)}</div>
      {!liveCamera && <div className="scan-directions" role="group" aria-label="Çekim yönü">{ANGLES.map((label, index) => <button key={label} onClick={() => setAngle(index)} aria-pressed={angle === index} className={`${angle === index ? "selected" : ""} ${counts[index] >= SHOTS_PER_SECTION ? "complete" : ""}`} disabled={locked}><span>{counts[index] >= SHOTS_PER_SECTION ? <CheckIcon size={15} weight="bold" /> : index + 1}</span>{label}<small>{counts[index]}/4</small></button>)}</div>}
      <div className="scan-angle-card"><span className="scan-angle-number">{String(angle + 1).padStart(2, "0")}</span><div><strong>{ANGLES[angle]}</strong><p>{pass ? "Telefonu güvenle biraz yükselt; tavanı ve bu yüzeyi birlikte göster." : "Aracın tamamını kadraja al. Bu yön boyunca küçük adımlarla ilerle."}</p></div></div>
      {liveCamera ? <CaptureCamera label={`${ANGLES[angle]} · ${PASSES[pass]}`} count={selected.length} onPhoto={async (file) => { setChecked(false); await s.add([file], angle, pass); }} onClose={() => setLiveCamera(false)} onFallback={() => { setLiveCamera(false); choose(camera.current); }} /> : <div className="scan-shots" aria-label={`${ANGLES[angle]} fotoğrafları`}>{selected.map((photo) => <figure key={photo.id}><img src={photo.url} alt={`${ANGLES[angle]}, ${PASSES[pass]}: ${photo.file.name}`} /><button aria-label={`${photo.file.name} çekimini kaldır`} className="remove-photo" disabled={locked} onClick={() => { s.remove(photo.id); setChecked(false); }}><TrashIcon size={16} /></button>{photo.warning && <figcaption>{photo.warning}</figcaption>}</figure>)}</div>}
      {s.busy && <p className="scan-feedback" role="status">Fotoğraflar kontrol ediliyor…</p>}
      {!liveCamera && <div className="scan-photo-actions"><button className="primary-button" disabled={locked} onClick={() => setLiveCamera(true)}><CameraIcon size={22} />Fotoğraf çek</button><button className="secondary-button" disabled={locked} onClick={() => choose(gallery.current)}><ImagesIcon size={22} />Galeriden</button></div>}
      {selected.length >= SHOTS_PER_SECTION && <button className="secondary-button" onClick={() => { if (angle < 7) setAngle(angle + 1); else if (pass === 0) { setPass(1); setAngle(0); } else setStep("review"); }}>Sonraki bölüm<CaretRightIcon size={18} /></button>}
      <button className="scan-text-button" disabled={s.busy} onClick={() => setStep("review")}>Çekimleri kontrol et · {s.photos.length} fotoğraf</button>
      <p className="scan-privacy">Her bölüm için farklı kareler · JPG / PNG · En az 1600 × 900 px</p>
    </>}
    {phase === "review" && <>
      <div className="scan-heading"><h2>Son bir kontrol.</h2><p>64 kare başlangıç eşiğidir. Yansıyan veya eksik yüzeyler için daha fazla çekim gerekebilir.</p></div>
      <div className="scan-review-list">{PASSES.map((label, index) => { const done = sectionCounts(s.photos, index).filter((count) => count >= 4).length; return <button key={label} onClick={() => { setPass(index); setAngle(Math.max(0, sectionCounts(s.photos, index).findIndex((count) => count < 4))); setStep("capture"); }}><CameraIcon size={22} /><span><strong>{label}</strong><small>{done} / 8 yön tamamlandı</small></span>{done === 8 ? <CheckCircleIcon size={22} /> : <CaretRightIcon size={20} />}</button>; })}</div>
      <div className="scan-review-stats"><span><strong>{s.photos.length}</strong>fotoğraf</span><span><strong>{Math.round(s.photos.reduce((sum, photo) => sum + photo.file.size, 0) / 1024 / 1024)}</strong>MB</span><span><strong>{warnings}</strong>kontrol uyarısı</span></div>
      <label className="scan-consent"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>Fotoğrafları kontrol ettim; aynı araca ait, net ve farklı açılardan.{warnings > 0 && <small>Işık/netlik uyarılarını çekim yönünden incele. Bu ön kontrol kesin kalite ölçümü değildir.</small>}</span></label>
      <div className={`scan-service ${s.service?.available ? "available" : ""}`}><span className="scan-service-dot" /><p>{s.service?.message ?? "Model üretim servisi kontrol ediliyor…"}</p><button aria-label="Model üretim bağlantısını yenile" onClick={() => void s.refreshService()}><CircleNotchIcon size={20} /></button></div>
      <button className="primary-button" disabled={completed < 64 || !checked || !s.service?.available || s.uploading || s.busy} onClick={() => void s.generate()}><CubeIcon size={22} />{s.uploading ? "Fotoğraflar aktarılıyor…" : "3D model oluştur"}</button>
      {s.uploading && <button className="scan-text-button" onClick={s.cancelUpload}>Gönderimi iptal et</button>}
      <p className="scan-privacy">İşleme bu Mac’te yapılır; üçüncü tarafa gönderilmez. Sunucu kopyası 24 saatlik süreyle tutulur. Üretim süresi ve kalite çekime göre değişir.</p>
    </>}
    {phase === "job" && <div className="scan-job">
      <div className={`scan-job-icon ${processing ? "processing" : ""}`}>{s.job?.status === "ready" ? <CheckCircleIcon size={52} weight="light" /> : <CubeIcon size={52} weight="light" />}</div>
      <div className="scan-heading"><span className="eyebrow">{s.job?.status === "ready" ? "ÇEKİMLERİNDEN OLUŞTURULDU" : "GERÇEK MODEL ÜRETİMİ"}</span><h2>{s.job?.status === "ready" ? "Aracın, üç boyutlu." : s.job?.status === "failed" ? "Biraz daha çekim gerekli." : "Aracın şekilleniyor."}</h2><p>{s.connectionLost ? "Bağlantı kesildi. İşlem Mac’te devam ediyor olabilir; yeniden bağlanmayı deniyoruz." : s.job?.message ?? "İşlem durumu alınıyor…"}</p></div>
      <div className="scan-progress" role="progressbar" aria-label="Gerçek model üretimi" aria-valuenow={s.job?.progress ?? 0} aria-valuemax={100}><span style={{ width: `${s.job?.progress ?? 0}%` }} /></div><p className="scan-feedback">{s.job?.progress ?? 0}%{s.job?.warnings ? ` · ${s.job.warnings} kare uyarısı` : ""}</p>
      {s.job?.status === "ready" && <><button className="primary-button" disabled={opening} onClick={() => void openModel()}><CubeIcon size={22} />{opening ? "Model açılıyor…" : "3D modelimi incele"}</button><button className="secondary-button" disabled={opening} onClick={() => void openModel(true)}><DownloadSimpleIcon size={20} />GLB dosyasını indir</button><p className="scan-privacy">Bu model ekspertiz raporu değildir. Görünmeyen yüzeyleri ve ince hasarları orijinal fotoğraflardan ayrıca doğrula.</p></>}
      <button className="scan-text-button" disabled={s.busy || opening} onClick={() => { void s.edit(); setStep("review"); setChecked(false); }}>{processing ? "İşlemi durdur, çekimleri koru" : "Çekimi düzenle"}</button>
    </div>}
    {s.error && <p className="upload-error" role="alert">{s.error}</p>}
    {!s.durable && <p className="upload-error" role="alert">Tarayıcıda kalıcı kayıt yapılamadı. Sayfayı kapatırsan bu çekimler kaybolabilir.</p>}
    {s.photos.length > 0 && !s.jobId && !s.uploading && <button className="scan-clear" disabled={s.busy} onClick={() => { if (confirmClear) { void s.edit(true); setConfirmClear(false); setStep("intro"); setChecked(false); } else setConfirmClear(true); }}><TrashIcon size={16} />{confirmClear ? "Evet, tüm çekimleri sil" : "Çekim taslağını sil"}</button>}
    {confirmClear && <button className="scan-text-button" onClick={() => setConfirmClear(false)}>Vazgeç</button>}
    <input className="file-input" ref={camera} type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Yönlendirmeli araç fotoğrafı çek" onChange={added} disabled={locked} tabIndex={-1} />
    <input className="file-input" ref={gallery} type="file" accept="image/jpeg,image/png" multiple aria-label="Seçili açı için fotoğraflar ekle" onChange={added} disabled={locked} tabIndex={-1} />
  </div>;
}
