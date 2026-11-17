import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUUpLeftIcon, DownloadSimpleIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import { ANGLES, PASSES, SHOTS_PER_SECTION, sectionCounts } from "./capture-policy";
import { tourFrameIndex, tourFrames, type TourPhoto } from "./photo-tour";

type Props = { photos: TourPhoto[] };
export default function VehicleTour({ photos }: Props) {
  const passes = PASSES.map((_, pass) => pass).filter((pass) => photos.some((photo) => photo.pass === pass));
  const [selectedPass, setPass] = useState(0);
  const pass = passes.includes(selectedPass) ? selectedPass : passes[0] ?? 0;
  const frames = useMemo(() => tourFrames(photos, pass), [photos, pass]);
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState<TourPhoto>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; index: number; pan: typeof pan } | null>(null);
  const counts = sectionCounts(frames, pass);
  const complete = counts.every((count) => count >= SHOTS_PER_SECTION);
  const currentIndex = tourFrameIndex(index, frames.length, complete);
  const requested = frames[currentIndex];
  const loading = !!requested && displayed?.url !== requested.url;
  function move(next: number) { setIndex(tourFrameIndex(next, frames.length, complete)); setPan({ x: 0, y: 0 }); }
  useEffect(() => {
    setError("");
    if (!requested) { setDisplayed(undefined); return; }
    let disposed = false;
    const image = new Image();
    image.onload = () => { if (!disposed) setDisplayed(requested); };
    image.onerror = () => { if (!disposed) setError("Fotoğraf açılamadı."); };
    image.src = requested.url;
    return () => { disposed = true; image.onload = image.onerror = null; image.src = ""; };
  }, [requested, retry]);
  useEffect(() => {
    if (!displayed || displayed.url !== requested?.url) return;
    // Keep only the adjacent originals warm; do not decode an entire 512 MB scan.
    const neighbors = [-1, 1].map((offset) => {
      const image = new Image();
      image.src = frames[tourFrameIndex(currentIndex + offset, frames.length, complete)].url;
      return image;
    });
    return () => { neighbors.forEach((image) => { image.src = ""; }); };
  }, [displayed, requested, currentIndex, frames, complete]);
  if (!frames.length) return <div className="tour-empty"><strong>Henüz tur fotoğrafı yok.</strong><p>Çevre turundaki yönleri sırayla çekerek başlayabilirsin.</p></div>;
  const visible = displayed && frames.some((frame) => frame.url === displayed.url) ? displayed : undefined;
  return <div className="photo-tour">
    <div className="tour-heading"><span className="eyebrow">ORİJİNAL ÇEKİMLER</span><h2>{complete ? "HD 360° fotoğraf turu" : "Fotoğraf önizlemesi"}</h2><p>{complete ? "Aracın kendi fotoğrafları. Yapay kare veya yüzey oluşturulmaz." : `${counts.filter((count) => count >= SHOTS_PER_SECTION).length} / 8 yön tamamlandı. Tam tur için her yönde altı ardışık kare çek.`}</p></div>
    {passes.length > 1 && <div className="scan-pass-switch tour-passes" role="group" aria-label="Fotoğraf turu yüksekliği">{passes.map((value) => <button key={value} aria-pressed={pass === value} className={pass === value ? "active" : ""} onClick={() => { setPass(value); setIndex(0); setZoom(false); setPan({ x: 0, y: 0 }); }}>{PASSES[value]}</button>)}</div>}
    <div className={`tour-stage ${zoom ? "is-zoomed" : ""}`} data-scroll-drag="ignore" role="group" aria-label="Araç fotoğraf turu; ok tuşlarıyla kare değiştir" tabIndex={0}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End", "+", "=", "-", "Escape"].includes(event.key)) event.preventDefault();
        if (event.key === "ArrowLeft") move(currentIndex - 1);
        if (event.key === "ArrowRight") move(currentIndex + 1);
        if (event.key === "Home") move(0);
        if (event.key === "End") move(frames.length - 1);
        if (["+", "="].includes(event.key)) setZoom(true);
        if (["-", "Escape"].includes(event.key)) { setZoom(false); setPan({ x: 0, y: 0 }); }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current || (event.target instanceof Element && event.target.closest("button"))) return;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, index: currentIndex, pan };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const x = event.clientX - start.x, y = event.clientY - start.y;
        if (zoom) {
          const bounds = event.currentTarget.getBoundingClientRect();
          setPan({ x: Math.max(-bounds.width / 2, Math.min(bounds.width / 2, start.pan.x + x)), y: Math.max(-bounds.height / 2, Math.min(bounds.height / 2, start.pan.y + y)) });
        } else if (Math.abs(x) >= 8) move(start.index - Math.trunc(x / 8));
      }}
      onPointerUp={(event) => { if (drag.current?.id === event.pointerId) drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      {visible && <img src={visible.url} alt={`${ANGLES[visible.angle]} · ${PASSES[pass]} · ${visible.name}`} draggable={false} style={{ transform: zoom ? `translate(${pan.x}px, ${pan.y}px) scale(2)` : undefined }} />}
      {loading && !error && <span className="tour-state" role="status">Fotoğraf açılıyor…</span>}
      {error && <div className="tour-state" role="alert"><span>Fotoğraf açılamadı. Çekim dosyasını kontrol et.</span><button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Yeniden dene</button></div>}
      <span className="tour-badge">{zoom ? "2× ayrıntı" : "Orijinal fotoğraf"}</span>
    </div>
    <div className="tour-caption"><strong>{visible ? ANGLES[visible.angle] : "Fotoğraf"}</strong><span>{currentIndex + 1} / {frames.length} kare</span></div>
    <p className="model-gesture">{zoom ? "Ayrıntıyı sürükleyerek incele" : "Sürükleyerek çevresinde dolaş"}</p>
    <input className="tour-range" type="range" min={0} max={frames.length - 1} value={currentIndex} aria-label="Tur karesi" aria-valuetext={`${currentIndex + 1} / ${frames.length}, ${ANGLES[requested.angle]}`} onChange={(event) => move(Number(event.target.value))} />
    <div className="model-controls tour-controls" role="group" aria-label="Fotoğraf turu kontrolleri">
      <button aria-label="Önceki kare" disabled={!complete && currentIndex === 0} onClick={() => move(currentIndex - 1)}><ArrowLeftIcon size={22} /></button>
      <button aria-label="Sonraki kare" disabled={!complete && currentIndex === frames.length - 1} onClick={() => move(currentIndex + 1)}><ArrowRightIcon size={22} /></button>
      <button aria-label={zoom ? "Ayrıntıdan çık" : "Fotoğrafı yakınlaştır"} aria-pressed={zoom} onClick={() => { setZoom(!zoom); setPan({ x: 0, y: 0 }); }}>{zoom ? <MagnifyingGlassMinusIcon size={22} /> : <MagnifyingGlassPlusIcon size={22} />}</button>
      <button aria-label="Fotoğraf turunu sıfırla" onClick={() => { move(0); setZoom(false); }}><ArrowUUpLeftIcon size={22} /></button>
    </div>
    {visible && !loading && !error && <a className="secondary-button tour-download" href={visible.url} download={visible.name}><DownloadSimpleIcon size={20} />Orijinal fotoğrafı indir</a>}
    <p className="model-file-note">Çekim sırası kullanılır; örtüşme ve tam çevre kapsamı otomatik doğrulanmaz. Fotoğraflar bu tarayıcıda kalır.</p>
  </div>;
}
