type StillCamera = {
  takePhoto: (settings?: { imageWidth?: number }) => Promise<Blob>;
  getPhotoCapabilities?: () => Promise<{ imageWidth?: { max: number } }>;
};

/** Prefer a camera still over a compressed video-preview frame when supported. */
export async function captureCameraStill(video: HTMLVideoElement, track?: MediaStreamTrack): Promise<Blob> {
  const StillCapture = (window as unknown as { ImageCapture?: new (track: MediaStreamTrack) => StillCamera }).ImageCapture;
  if (StillCapture && track?.readyState === "live") {
    try {
      const camera = new StillCapture(track);
      const capabilities = await camera.getPhotoCapabilities?.();
      const maxWidth = capabilities?.imageWidth?.max;
      const blob = await camera.takePhoto(maxWidth ? { imageWidth: Math.min(maxWidth, 4096) } : undefined);
      if (["image/jpeg", "image/png"].includes(blob.type) && blob.size) return blob;
    } catch { /* Some browsers expose ImageCapture but cannot take stills on this camera. */ }
  }
  if (!video.videoWidth || !video.videoHeight) throw new Error("Kamera henüz hazır değil.");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fotoğraf alınamadı.");
  context.drawImage(video, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Fotoğraf alınamadı.")), "image/jpeg", .97));
}
