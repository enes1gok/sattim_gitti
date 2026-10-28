export function validateModelFile(buffer: ArrayBuffer): void {
  if (buffer.byteLength > 20 * 1024 * 1024) throw new Error("Model en fazla 20 MB olabilir.");
  if (buffer.byteLength < 20) throw new Error("Geçerli bir GLB 2.0 dosyası seç.");
  const view = new DataView(buffer);
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a || jsonLength > 2 * 1024 * 1024 || jsonLength + 20 > buffer.byteLength) {
    throw new Error("Geçerli bir GLB 2.0 dosyası seç.");
  }
  let manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength))); }
  catch { throw new Error("Model bilgileri okunamadı."); }
  if (!manifest || !Array.isArray(manifest.scenes) || !manifest.scenes.length) throw new Error("Modelde görüntülenecek bir sahne yok.");
  for (const key of ["images", "buffers", "nodes", "accessors"]) {
    if (manifest[key] !== undefined && !Array.isArray(manifest[key])) throw new Error("Model bilgileri geçerli bir GLB yapısında değil.");
  }
  for (const item of [...(manifest.images ?? []), ...(manifest.buffers ?? [])]) {
    if (!item || typeof item !== "object") throw new Error("Model bilgileri geçerli bir GLB yapısında değil.");
    if (item.uri && (typeof item.uri !== "string" || !item.uri.startsWith("data:"))) throw new Error("Dokuları ve diğer dosyaları içinde bulunan tek bir GLB seç.");
  }
  const vertices = (manifest.accessors ?? []).reduce((sum: number, accessor: { count?: number }) => sum + (Number.isFinite(accessor.count) ? Math.max(0, accessor.count!) : 0), 0);
  if (vertices > 3_000_000 || (manifest.nodes?.length ?? 0) > 2000 || (manifest.images?.length ?? 0) > 64) throw new Error("Bu model mobil önizleme için fazla ayrıntılı. Daha hafif bir GLB seç.");
}
