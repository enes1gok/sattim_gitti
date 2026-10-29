import { useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "@phosphor-icons/react";
import { captureCameraStill } from "./camera-still";
import { SHOTS_PER_SECTION } from "./capture-policy";

type Props = { label: string; count: number; onPhoto: (file: File) => Promise<void>; onClose: () => void; onFallback: () => void };
export default function CaptureCamera({ label, count, onPhoto, onClose, onFallback }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const cameraTrack = useRef<MediaStreamTrack | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [taking, setTaking] = useState(false);
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    const stop = () => { stream?.getTracks().forEach((track) => track.stop()); cameraTrack.current = undefined; setReady(false); };
    const pause = () => { if (document.hidden) { stop(); setError("Kamera duraklatıldı. Çekime dönmek için kamerayı yeniden aç."); } };
    const open = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false });
        if (disposed) { stop(); return; }
        cameraTrack.current = stream.getVideoTracks()[0];
        if (video.current) { video.current.srcObject = stream; await video.current.play(); if (!disposed) setReady(true); }
      } catch { if (!disposed) setError("Kamera açılamadı. Tarayıcı iznini kontrol et veya telefon kamerası / galeriden devam et."); }
    };
    void open();
    document.addEventListener("visibilitychange", pause);
    return () => { disposed = true; stop(); document.removeEventListener("visibilitychange", pause); };
  }, []);
  async function shoot() {
    const source = video.current;
    if (!source || !ready || taking) return;
    setTaking(true); setError("");
    try {
      const blob = await captureCameraStill(source, cameraTrack.current);
      await onPhoto(new File([blob], `arac-${Date.now()}.${blob.type === "image/png" ? "png" : "jpg"}`, { type: blob.type }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Fotoğraf alınamadı."); }
    finally { setTaking(false); }
  }
  return <div className="scan-camera">
    <div className="scan-camera-preview"><video ref={video} muted playsInline aria-label="Canlı araç kamerası" /><div className="scan-camera-guide"><span>{label}</span><strong>{count} / {SHOTS_PER_SECTION}</strong></div><button className="scan-camera-close" aria-label="Canlı kamerayı kapat" onClick={onClose}><XIcon size={21} /></button>{!ready && <p role="status">{error ? "Kamera kullanılamıyor" : "Kamera açılıyor…"}</p>}</div>
    <p className="scan-privacy">Aracı kadrajda tut. Her kare arasında küçük bir adım at; telefonu sabit tutarak çek.</p>
    {error && <p className="upload-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={!ready || taking} onClick={() => void shoot()}><CameraIcon size={23} />{taking ? "Fotoğraf kaydediliyor…" : "Kareyi yakala"}</button>
    <button className="scan-text-button" disabled={taking} onClick={onFallback}>Telefon kamerası / dosya seçiciyle devam et</button>
  </div>;
}
