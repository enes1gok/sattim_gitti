import { useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "@phosphor-icons/react";

type Props = { label: string; count: number; onPhoto: (file: File) => Promise<void>; onClose: () => void; onFallback: () => void };
export default function CaptureCamera({ label, count, onPhoto, onClose, onFallback }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [taking, setTaking] = useState(false);
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    const stop = () => { stream?.getTracks().forEach((track) => track.stop()); setReady(false); };
    const pause = () => { if (document.hidden) { stop(); setError("Kamera duraklatıldı. Çekime dönmek için kamerayı yeniden aç."); } };
    const open = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false });
        if (disposed) { stop(); return; }
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
      if (!source.videoWidth || !source.videoHeight) throw new Error("Kamera henüz hazır değil.");
      const canvas = document.createElement("canvas");
      canvas.width = source.videoWidth; canvas.height = source.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Fotoğraf alınamadı.");
      context.drawImage(source, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Fotoğraf alınamadı.")), "image/jpeg", .95));
      await onPhoto(new File([blob], `arac-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Fotoğraf alınamadı."); }
    finally { setTaking(false); }
  }
  return <div className="scan-camera">
    <div className="scan-camera-preview"><video ref={video} muted playsInline aria-label="Canlı araç kamerası" /><div className="scan-camera-guide"><span>{label}</span><strong>{count} / 4</strong></div><button className="scan-camera-close" aria-label="Canlı kamerayı kapat" onClick={onClose}><XIcon size={21} /></button>{!ready && <p role="status">{error ? "Kamera kullanılamıyor" : "Kamera açılıyor…"}</p>}</div>
    <p className="scan-privacy">Aracı kadrajda tut. Her kare arasında küçük bir adım at; telefonu sabit tutarak çek.</p>
    {error && <p className="upload-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={!ready || taking} onClick={() => void shoot()}><CameraIcon size={23} />{taking ? "Fotoğraf kaydediliyor…" : "Kareyi yakala"}</button>
    <button className="scan-text-button" disabled={taking} onClick={onFallback}>Telefon kamerası / dosya seçiciyle devam et</button>
  </div>;
}
