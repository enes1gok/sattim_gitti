import { useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "@phosphor-icons/react";

type Props = { label: string; hint: string; onCapture: (file: File) => void; onClose: () => void; onFallback: () => void };

export function PhotoCamera({ label, hint, onCapture, onClose, onFallback }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        if (active) setReady(true);
      } catch {
        stream?.getTracks().forEach((track) => track.stop());
        if (active) setError("Kameraya erişilemedi. İzinleri kontrol et veya cihazın kamera uygulamasını kullan.");
      }
    }
    void start();
    return () => { active = false; stream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  function capture() {
    const current = video.current;
    if (!current?.videoWidth || !current.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = current.videoWidth; canvas.height = current.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setError("Fotoğraf hazırlanamadı. Tekrar dene."); return; }
    context.drawImage(current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) { setError("Fotoğraf hazırlanamadı. Tekrar dene."); return; }
      onCapture(new File([blob], "fotograf.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.88);
  }
  return <section className="photo-camera" aria-label={`${label} fotoğrafını çek`}>
    <div className="photo-camera-header"><div><span>FOTOĞRAF ÇEK</span><strong>{label}</strong></div><button type="button" aria-label="Kamerayı kapat" onClick={onClose}><XIcon size={20} /></button></div>
    <p>{hint}</p>
    <div className="photo-camera-view"><video ref={video} playsInline muted aria-label="Kamera önizlemesi" />{!ready && !error && <span>Kamera açılıyor…</span>}{error && <span role="alert">{error}</span>}</div>
    {error ? <button type="button" className="secondary-button" onClick={onFallback}>Cihaz kamerasını aç</button> : <button type="button" className="primary-button" disabled={!ready} onClick={capture}><CameraIcon size={20} />Fotoğraf çek</button>}
  </section>;
}
