import type { CaptureDescriptor } from "./capture-policy";
import { validateAppearanceFile, validateAppearanceBounds, type AppearanceBounds, type AppearanceModel } from "./appearance-file";

export const RECONSTRUCTION_URL = "http://127.0.0.1:4180";
export type ReconstructionJob = { id: string; status: "processing" | "converting" | "ready" | "failed"; progress: number; message: string; warnings: number; appearanceStatus?: "processing" | "ready" | "failed"; appearanceMessage?: string; appearanceBounds?: AppearanceBounds };
export type ServiceStatus = { available: boolean; appearanceAvailable?: boolean; message: string };

async function responseJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.message || "İşlem tamamlanamadı."), { status: response.status });
  return body;
}

export async function checkReconstruction(signal?: AbortSignal): Promise<ServiceStatus> {
  try {
    return await fetch(`${RECONSTRUCTION_URL}/health`, { signal: signal ?? AbortSignal.timeout(5000) }).then(responseJson);
  } catch (reason) {
    if (signal?.aborted) throw reason;
    return { available: false, message: "Model üretim servisine ulaşılamadı. Çekimlerin cihazında korunur." };
  }
}

export async function startReconstruction(photos: (CaptureDescriptor & { file: File })[], signal: AbortSignal): Promise<ReconstructionJob> {
  const data = new FormData();
  data.append("capture", JSON.stringify(photos.map(({ id, angle, pass }) => ({ id, angle, pass }))));
  photos.forEach((photo) => data.append(photo.id, photo.file, `${photo.id}.${photo.file.type === "image/png" ? "png" : "jpg"}`));
  return fetch(`${RECONSTRUCTION_URL}/jobs`, { method: "POST", body: data, signal }).then(responseJson);
}

export async function getReconstruction(id: string, signal: AbortSignal): Promise<ReconstructionJob> {
  return fetch(`${RECONSTRUCTION_URL}/jobs/${encodeURIComponent(id)}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }).then(responseJson);
}

export async function removeReconstruction(id: string): Promise<void> {
  const response = await fetch(`${RECONSTRUCTION_URL}/jobs/${encodeURIComponent(id)}`, { method: "DELETE", signal: AbortSignal.timeout(10000) });
  if (response.status !== 404 && response.status !== 410) await responseJson(response);
}

export async function loadReconstruction(id: string): Promise<ArrayBuffer> {
  const response = await fetch(`${RECONSTRUCTION_URL}/jobs/${encodeURIComponent(id)}/model`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("3D model açılamadı. Yeniden dene.");
  return response.arrayBuffer();
}

export async function startAppearance(id: string): Promise<ReconstructionJob> {
  return fetch(`${RECONSTRUCTION_URL}/jobs/${encodeURIComponent(id)}/appearance`, { method: "POST", signal: AbortSignal.timeout(15000) }).then(responseJson);
}

export async function loadAppearance(job: ReconstructionJob): Promise<AppearanceModel> {
  validateAppearanceBounds(job.appearanceBounds);
  const response = await fetch(`${RECONSTRUCTION_URL}/jobs/${encodeURIComponent(job.id)}/appearance`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Gerçekçi görünüm açılamadı. Yeniden dene.");
  const buffer = await response.arrayBuffer(); validateAppearanceFile(buffer);
  return { buffer, bounds: job.appearanceBounds };
}
