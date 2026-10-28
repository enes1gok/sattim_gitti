import type { CaptureDescriptor } from "./capture-policy";

export type StoredCapture = CaptureDescriptor & { file: File; hash: string; warning: string };
export type CaptureDraft = { photos: StoredCapture[]; jobId?: string };
const EMPTY: CaptureDraft = { photos: [] };

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sattim-gitti-scan", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("draft");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCaptureDraft(): Promise<CaptureDraft> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("draft", "readonly");
    const request = transaction.objectStore("draft").get("current");
    request.onsuccess = () => resolve(request.result ?? EMPTY);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function saveCaptureDraft(draft: CaptureDraft): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("draft", "readwrite");
    transaction.objectStore("draft").put(draft, "current");
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}
