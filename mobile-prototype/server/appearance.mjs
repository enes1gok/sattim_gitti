import { readFile, writeFile, mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { validateAppearanceFile, validateAppearanceBounds } from "../src/appearance-file.ts";

async function nativeGeometry(directory) {
  const file = (await readdir(directory)).find((name) => name.endsWith(".obj"));
  if (!file) throw new Error("Aracın yüzey sınırları bulunamadı.");
  const path = join(directory, file);
  if ((await stat(path)).size > 100 * 1024 * 1024) throw new Error("Geometri sınırları işlenemedi.");
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const vertices = [];
  for (const line of (await readFile(path, "utf8")).split("\n")) {
    if (!/^v\s/.test(line)) continue;
    const xyz = line.trim().split(/\s+/).slice(1, 4).map(Number);
    if (xyz.length !== 3 || xyz.some((value) => !Number.isFinite(value))) throw new Error("Geometri sınırları geçerli değil.");
    xyz.forEach((value, axis) => { bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value); });
    vertices.push(xyz);
  }
  validateAppearanceBounds(bounds);
  return { bounds, vertices };
}
export async function nativeGeometryBounds(directory) { return (await nativeGeometry(directory)).bounds; }

/** Camera distribution is a coverage check, not a surface-accuracy score. */
export function assessCameraCoverage(cameras, bounds) {
  validateAppearanceBounds(bounds);
  if (!Array.isArray(cameras) || cameras.length < 32) throw new Error("Çevre kapsamı için yeterli eşleşmiş kamera yok.");
  const center = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2);
  const azimuths = [], elevations = [];
  for (const camera of cameras) {
    if (!Array.isArray(camera.position) || camera.position.length !== 3 || camera.position.some((v) => !Number.isFinite(v))) throw new Error("Kamera konumu geçerli değil.");
    const [x, y, z] = camera.position.map((v, axis) => v - center[axis]);
    azimuths.push((Math.atan2(x, z) * 180 / Math.PI + 360) % 360);
    elevations.push(Math.atan2(y, Math.hypot(x, z)) * 180 / Math.PI);
  }
  azimuths.sort((a, b) => a - b);
  const largestGapDegrees = Math.max(...azimuths.map((value, i) => (azimuths[i + 1] ?? azimuths[0] + 360) - value));
  const elevationRangeDegrees = Math.max(...elevations) - Math.min(...elevations);
  return { matchedCameras: cameras.length, largestGapDegrees, elevationRangeDegrees,
    needsMoreViews: largestGapDegrees > 60 || elevationRangeDegrees < 10 };
}

export function cropAppearanceModel(model, bounds, vertices) {
  validateAppearanceBounds(bounds);
  validateAppearanceFile(Uint8Array.from(model).buffer);
  const end = model.indexOf("end_header\n") + 11;
  const header = model.subarray(0, end).toString("utf8");
  const properties = header.split("\n").filter((line) => line.startsWith("property float ")).map((line) => line.slice(15));
  const stride = properties.length * 4;
  const indices = ["x", "y", "z"].map((key) => properties.indexOf(key) * 4);
  const extent = Math.max(...bounds.max.map((value, i) => value - bounds.min[i]));
  const radius = extent * .03, radiusSquared = radius * radius;
  const ny = Math.ceil((bounds.max[1] - bounds.min[1]) / radius) + 3, nz = Math.ceil((bounds.max[2] - bounds.min[2]) / radius) + 3;
  const cell = (point) => point.map((v, i) => Math.floor((v - bounds.min[i]) / radius) + 1);
  const key = (x, y, z) => (x * ny + y) * nz + z;
  const surface = new Map();
  for (const vertex of vertices ?? []) {
    const [x, y, z] = cell(vertex), id = key(x, y, z);
    if (!surface.has(id)) surface.set(id, []);
    surface.get(id).push(vertex);
  }
  const supported = (point) => {
    if (!vertices) return true;
    const [x, y, z] = cell(point);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const vertex of surface.get(key(x+a, y+b, z+c)) ?? []) {
        if ((vertex[0]-point[0])**2 + (vertex[1]-point[1])**2 + (vertex[2]-point[2])**2 <= radiusSquared) return true;
      }
    }
    return false;
  };
  const scaleIndices = [0, 1, 2].map((i) => properties.indexOf(`scale_${i}`) * 4);
  const opacityIndex = properties.indexOf("opacity") * 4;
  const rows = [];
  for (let offset = end; offset < model.length; offset += stride) {
    const point = indices.map((index) => model.readFloatLE(offset + index));
    const nearGround = point[1] < bounds.min[1] + (bounds.max[1] - bounds.min[1]) * .1;
    const maximumScale = extent * (nearGround ? .015 : .05);
    if (indices.every((index, axis) => {
      const margin = (bounds.max[axis] - bounds.min[axis]) * .03;
      const value = model.readFloatLE(offset + index);
      return value >= bounds.min[axis] - margin && value <= bounds.max[axis] + margin;
    }) && (!vertices || (scaleIndices.every((i) => Math.exp(model.readFloatLE(offset + i)) <= maximumScale) && model.readFloatLE(offset + opacityIndex) >= Math.log(.01/.99))) && supported(point)) rows.push(model.subarray(offset, offset + stride));
  }
  if (rows.length < 1000) throw new Error("Araca ait yeterli görünüm noktası bulunamadı.");
  return Buffer.concat([Buffer.from(header.replace(/element vertex \d+/, `element vertex ${rows.length}`)), ...rows]);
}

export function cameraFrame(camera, width, height) {
  const values = [...(camera.position ?? []), ...(camera.rotation ?? []), ...(camera.intrinsics ?? [])];
  if (values.length !== 11 || values.some((v) => !Number.isFinite(v)) || camera.intrinsics[0] <= 0 || camera.intrinsics[1] <= 0) throw new Error("Kamera kalibrasyonu eksik.");
  let [x, y, z, w] = camera.rotation;
  const length = Math.hypot(x, y, z, w);
  if (length < .9 || length > 1.1) throw new Error("Kamera dönüşü geçerli değil.");
  x /= length; y /= length; z /= length; w /= length;
  const [tx, ty, tz] = camera.position;
  const [fx, fy, cx, cy] = camera.intrinsics;
  return { file_path: `images/${camera.file}`, w: width, h: height, fl_x: fx, fl_y: fy, cx, cy,
    transform_matrix: [
      [1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w), tx],
      [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w), ty],
      [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y), tz], [0,0,0,1],
    ] };
}

export async function prepareAppearance(input, output, destination, masks, signal) {
  const cameras = JSON.parse(await readFile(join(output, "cameras.json"), "utf8"));
  if (!Array.isArray(cameras) || cameras.length < 32 || cameras.length > 160) throw new Error("Gerçekçi görünüm için yeterli kamera eşleşmesi yok.");
  const photoCount = (await readdir(input)).filter((name) => /\.(jpg|png)$/i.test(name)).length;
  if (cameras.length < photoCount * .8) throw new Error("Çekimlerin yeterli bölümü eşleşmedi. Örtüşen kareler ekleyerek yeniden dene.");
  await mkdir(join(destination, "images"), { recursive: true });
  const frames = [], names = new Set();
  for (const camera of cameras) {
    signal?.throwIfAborted();
    if (!/^[a-zA-Z0-9_-]+\.(jpg|png)$/i.test(camera.file) || names.has(camera.file)) throw new Error("Kamera fotoğrafı geçerli değil.");
    names.add(camera.file);
    const source = join(input, camera.file);
    const metadata = await sharp(source, { limitInputPixels: 80_000_000 }).metadata();
    if (metadata.orientation && metadata.orientation !== 1) throw new Error("Bu çekimin fotoğraf yönü gerçekçi görünüm için henüz desteklenmiyor.");
    const frame = cameraFrame(camera, metadata.width, metadata.height);
    if (masks) {
      const maskPath = join(masks, `${camera.file}.png`);
      const maskMetadata = await sharp(maskPath, { limitInputPixels: 2_000_000 }).metadata();
      if (!maskMetadata.width || !maskMetadata.height || Math.max(maskMetadata.width, maskMetadata.height) > 1280 || Math.abs(maskMetadata.width / maskMetadata.height - metadata.width / metadata.height) > .01) throw new Error("Araç maskesi fotoğrafla eşleşmiyor.");
      const width = maskMetadata.width, height = maskMetadata.height;
      const alpha = await sharp(maskPath).dilate(2).blur(.4).toColourspace("b-w").raw().toBuffer();
      const rgb = await sharp(source).resize(width, height).removeAlpha().toColourspace("srgb").raw().toBuffer();
      await sharp(rgb, { raw: { width, height, channels: 3 } }).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toFile(join(destination, "images", `${camera.file}.png`));
      frame.file_path = `images/${camera.file}.png`;
      frame.fl_x *= width / metadata.width; frame.cx *= width / metadata.width;
      frame.fl_y *= height / metadata.height; frame.cy *= height / metadata.height;
      frame.w = width; frame.h = height;
    } else await copyFile(source, join(destination, "images", camera.file));
    frames.push(frame);
  }
  await copyFile(join(output, "sparse.ply"), join(destination, "seed.ply"));
  frames.sort((a, b) => a.file_path.localeCompare(b.file_path));
  await writeFile(join(destination, "transforms.json"), JSON.stringify({ camera_model: "OPENCV", k1: 0, k2: 0, p1: 0, p2: 0, ply_file_path: "seed.ply", frames }));
  return frames.length;
}

export async function trainAppearance(binary, input, output, signal, { steps = 12000, start = 0 } = {}) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 30000 || !Number.isInteger(start) || start < 0 || start >= steps) throw new Error("Eğitim adımı geçerli değil.");
  await mkdir(output, { recursive: true });
  await new Promise((resolve, reject) => {
    const child = spawn(binary, [input, "--total-steps", String(steps), "--start-iter", String(start), "--growth-stop-iter", String(Math.floor(steps * .75)), "--max-splats", "180000", "--refine-every", "100", "--growth-select-fraction", "0.3", "--growth-grad-threshold", "0.00001", "--max-resolution", "1280", "--export-every", "2000", "--export-path", output], { stdio: "ignore", signal, timeout: 60 * 60 * 1000 });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error("Gerçekçi görünüm eğitimi tamamlanamadı.")));
  });
  signal.throwIfAborted();
  const model = await readFile(join(output, `export_${steps}.ply`));
  validateAppearanceFile(Uint8Array.from(model).buffer);
  return model;
}

export async function generateAppearanceMasks(binary, input, output, destination, signal) {
  await new Promise((resolve, reject) => {
    const child = spawn(binary, [input, output, destination], { stdio: "ignore", signal, timeout: 10 * 60 * 1000 });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error("Araç maskeleri hazırlanamadı.")));
  });
}

export async function appearanceEngine(binary, maskBinary) {
  const supports = (file, argument) => new Promise((resolve) => {
    const child = spawn(file, [argument], { stdio: "ignore", timeout: 20000 });
    child.on("error", () => resolve(false)); child.on("close", (code) => resolve(code === 0));
  });
  const available = (await Promise.all([supports(binary, "--version"), supports(maskBinary, "--check")])).every(Boolean);
  return { available, async run(input, output, directory, signal) {
    const { bounds, vertices } = await nativeGeometry(output);
    validateAppearanceBounds(bounds);
    const coverage = assessCameraCoverage(JSON.parse(await readFile(join(output, "cameras.json"), "utf8")), bounds);
    await writeFile(join(directory, "camera-coverage.json"), JSON.stringify(coverage));
    if (coverage.needsMoreViews) throw new Error("Eşleşen çekimlerde çevre veya yükseklik boşluğu var. Çevre, yüksek ve alçak turları örtüşen yeni karelerle tamamla. 3D geometri korundu.");
    const masks = join(directory, "appearance-masks");
    await generateAppearanceMasks(maskBinary, input, output, masks, signal);
    await prepareAppearance(input, output, join(directory, "appearance-input"), masks, signal);
    signal.throwIfAborted();
    const model = await trainAppearance(binary, join(directory, "appearance-input"), join(directory, "appearance-training"), signal);
    return { model: cropAppearanceModel(model, bounds, vertices), bounds };
  } };
}
