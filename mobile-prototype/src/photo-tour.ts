import type { CaptureDescriptor } from "./capture-policy";

export type TourPhoto = CaptureDescriptor & { url: string; name: string };

/** Angle order, then original capture order; never interpolate or fabricate frames. */
export function tourFrames(photos: TourPhoto[], pass: number): TourPhoto[] {
  return photos.filter((photo) => photo.pass === pass).sort((a, b) => a.angle - b.angle);
}

export function tourFrameIndex(index: number, length: number, complete: boolean): number {
  if (!length) return 0;
  return complete ? ((index % length) + length) % length : Math.max(0, Math.min(length - 1, index));
}
