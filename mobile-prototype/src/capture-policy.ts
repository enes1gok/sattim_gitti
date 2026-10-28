export const ANGLES = ["Ön", "Ön sağ", "Sağ yan", "Arka sağ", "Arka", "Arka sol", "Sol yan", "Ön sol"] as const;
export const PASSES = ["Çevre turu", "Yüksek açı"] as const;
export const SHOTS_PER_SECTION = 4;
export const MAX_CAPTURE_PHOTOS = 160;
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
export const MAX_SCAN_BYTES = 512 * 1024 * 1024;
export type CaptureDescriptor = { id: string; angle: number; pass: number };

export function sectionCounts(photos: CaptureDescriptor[], pass: number): number[] {
  return ANGLES.map((_, angle) => photos.filter((photo) => photo.angle === angle && photo.pass === pass).length);
}

export function captureCompletion(photos: CaptureDescriptor[]): number {
  return PASSES.reduce((total, _, pass) => total + sectionCounts(photos, pass).reduce((sum, count) => sum + Math.min(count, SHOTS_PER_SECTION), 0), 0);
}

export function validateCapture(photos: CaptureDescriptor[]): void {
  if (!Array.isArray(photos) || photos.length > MAX_CAPTURE_PHOTOS) throw new Error("En fazla 160 fotoğraf ekleyebilirsin.");
  const ids = new Set<string>();
  for (const photo of photos) {
    if (!photo || typeof photo.id !== "string" || !/^[a-f0-9-]{36}$/.test(photo.id) || ids.has(photo.id) || !Number.isInteger(photo.angle) || photo.angle < 0 || photo.angle >= ANGLES.length || !Number.isInteger(photo.pass) || photo.pass < 0 || photo.pass >= PASSES.length) throw new Error("Çekim bilgileri geçerli değil.");
    ids.add(photo.id);
  }
  if (captureCompletion(photos) < ANGLES.length * PASSES.length * SHOTS_PER_SECTION) throw new Error("Her iki turda da sekiz açıyı en az dörder fotoğrafla tamamla.");
}
