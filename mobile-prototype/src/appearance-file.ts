export const MAX_APPEARANCE_BYTES = 50 * 1024 * 1024;
export const MAX_APPEARANCE_SPLATS = 200_000;
export type AppearanceBounds = { min: [number, number, number]; max: [number, number, number] };
export type AppearanceModel = { buffer: ArrayBuffer; bounds: AppearanceBounds };

export function validateAppearanceBounds(value: unknown): asserts value is AppearanceBounds {
  const b = value as AppearanceBounds | undefined;
  if (!b || !Array.isArray(b.min) || !Array.isArray(b.max) || b.min.length !== 3 || b.max.length !== 3 || [...b.min, ...b.max].some((v) => !Number.isFinite(v) || Math.abs(v) > 1000) || b.min.some((v, i) => b.max[i] <= v)) throw new Error("Gerçekçi görünümün sınırları geçerli değil.");
  if (Math.max(...b.max.map((v, i) => v - b.min[i])) < .0001) throw new Error("Gerçekçi görünümün boyutları desteklenmiyor.");
}

/** Accept only bounded, self-contained binary Gaussian PLY data. */
export function validateAppearanceFile(buffer: ArrayBuffer): number {
  if (buffer.byteLength > MAX_APPEARANCE_BYTES) throw new Error("Gerçekçi görünüm dosyası 50 MB sınırını aşıyor.");
  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 16384)));
  const end = header.indexOf("end_header\n");
  if (!header.startsWith("ply\nformat binary_little_endian 1.0\n") || end < 0) throw new Error("Geçerli bir Gaussian PLY dosyası gerekli.");
  const lines = header.slice(0, end).split("\n");
  const elements = lines.filter((line) => line.startsWith("element "));
  const count = Number(/^element vertex (\d+)$/.exec(elements[0] ?? "")?.[1]);
  if (elements.length !== 1 || !Number.isInteger(count) || count < 1 || count > MAX_APPEARANCE_SPLATS) throw new Error("Gerçekçi görünümün nokta sayısı desteklenmiyor.");
  const properties = lines.filter((line) => line.startsWith("property "));
  if (properties.length > 80 || properties.some((line) => !/^property float [a-zA-Z0-9_]+$/.test(line))) throw new Error("Gaussian veri yapısı desteklenmiyor.");
  const names = properties.map((line) => line.slice(15));
  if (new Set(names).size !== names.length || ["x", "y", "z", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3", "f_dc_0", "f_dc_1", "f_dc_2"].some((name) => !names.includes(name))) throw new Error("Gaussian görünüm bilgileri eksik.");
  const offset = end + "end_header\n".length;
  if (offset + count * properties.length * 4 !== bytes.length) throw new Error("Gaussian görünüm dosyası eksik veya bozuk.");
  const data = new DataView(buffer);
  for (let i = offset; i < bytes.length; i += 4) {
    const value = data.getFloat32(i, true);
    if (!Number.isFinite(value) || Math.abs(value) > 1_000_000) throw new Error("Gaussian görünüm değerleri geçerli değil.");
  }
  return count;
}
