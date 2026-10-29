import { createServer } from "node:http";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, readdir, rm, rename, link, chmod } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import Busboy from "busboy";
import sharp from "sharp";
import { convertMobileModel } from "./mobile-model.mjs";
import { appearanceEngine } from "./appearance.mjs";
import { validateAppearanceFile, validateAppearanceBounds } from "../src/appearance-file.ts";
import { validateCapture, MAX_SCAN_BYTES, MAX_PHOTO_BYTES, MAX_CAPTURE_PHOTOS } from "../src/capture-policy.ts";
import { validateModelFile } from "../src/model-file.ts";

const project = fileURLToPath(new URL("../", import.meta.url));
const lifetime = 24 * 60 * 60 * 1000;
const validId = (value) => /^[a-f0-9-]{36}$/.test(value);
const failure = (message, status = 400) => Object.assign(new Error(message), { status });
const publicJob = ({ id, status, progress, message, warnings, appearanceStatus, appearanceMessage, appearanceBounds }) => ({ id, status, progress, message, warnings, appearanceStatus, appearanceMessage, appearanceBounds });

export async function nativeEngine(binary) {
  const available = await new Promise((resolve) => {
    const child = spawn(binary, ["--check"], { stdio: "ignore", timeout: 20000 });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
  return {
    available,
    async run(input, output, update, signal) {
      await new Promise((resolve, reject) => {
        const child = spawn(binary, [input, output], { stdio: ["ignore", "pipe", "ignore"], signal, timeout: 60 * 60 * 1000 });
        const lines = createInterface({ input: child.stdout });
        let error = "Fotoğraflar eşleştirilemedi. Daha çok örtüşen açı ve dağınık gün ışığıyla yeniden çek.";
        lines.on("line", (line) => {
          try {
            const event = JSON.parse(line);
            if (event.error) error = "Model üretilemedi. Çekimlerin korundu; örtüşen kareleri ve ışığı kontrol et.";
            update(event);
          } catch { /* Ignore native diagnostic lines; only JSON events belong to the API. */ }
        });
        child.on("error", reject);
        child.on("close", (code, signal) => code === 0 ? resolve() : reject(new Error(signal ? "İşlem kesildi veya süre sınırına ulaştı. Çekimlerin korundu; yeniden deneyebilirsin." : error)));
      });
    },
  };
}

export async function reconstructionServer({ root = join(project, ".local/reconstructions"), origin = "http://127.0.0.1:4173", engine, appearanceWorker } = {}) {
  const worker = engine ?? await nativeEngine(join(project, ".local/bin/reconstruct"));
  const appearance = appearanceWorker ?? await appearanceEngine(join(project, ".local/tools/brush/brush-app-aarch64-apple-darwin/brush_app"), join(project, ".local/bin/render-masks"));
  await mkdir(root, { recursive: true, mode: 0o700 });
  const jobs = new Map();
  let accepting = false;
  for (const id of await readdir(root)) {
    if (!validId(id)) continue;
    try {
      const stored = JSON.parse(await readFile(join(root, id, "job.json"), "utf8"));
      if (Date.now() - stored.created > lifetime) { await rm(join(root, id), { recursive: true, force: true }); continue; }
      if (stored.status !== "ready" && stored.status !== "failed") Object.assign(stored, { status: "failed", message: "Servis yeniden başladı. Çekimlerinle yeniden deneyebilirsin." });
      if (stored.appearanceStatus === "processing") Object.assign(stored, { appearanceStatus: "failed", appearanceMessage: "Servis yeniden başladı. Geometrin korundu; gerçekçi görünümü yeniden hazırlayabilirsin." });
      jobs.set(id, { ...stored, abort: new AbortController() });
    } catch { await rm(join(root, id), { recursive: true, force: true }); }
  }
  const persist = (job) => writeFile(join(root, job.id, "job.json"), JSON.stringify({ ...publicJob(job), created: job.created }), { mode: 0o600 });
  const retention = setInterval(() => {
    for (const job of jobs.values()) if (Date.now() - job.created > lifetime) {
      job.abort.abort(); jobs.delete(job.id);
      void rm(join(root, job.id), { recursive: true, force: true }).catch(() => {});
    }
  }, 60000);
  retention.unref();
  async function processJob(job) {
    const directory = join(root, job.id);
    try {
      await worker.run(join(directory, "input"), join(directory, "output"), (event) => {
        if (Number.isFinite(event.progress)) job.progress = Math.max(job.progress, Math.min(90, Math.round(event.progress * 90)));
        if (event.warning) job.warnings++;
      }, job.abort.signal);
      job.abort.signal.throwIfAborted();
      job.status = "converting";
      job.message = "Mobil 3D model hazırlanıyor.";
      job.progress = 95;
      const glb = await convertMobileModel(join(directory, "output"));
      job.abort.signal.throwIfAborted();
      validateModelFile(Uint8Array.from(glb).buffer);
      await writeFile(join(directory, "model.glb"), glb, { mode: 0o600 });
      Object.assign(job, { status: "ready", progress: 100, message: "3D modelin hazır. Eksik yüzeyleri orijinal fotoğraflarla kontrol et." });
    } catch (error) {
      if (!job.abort.signal.aborted) Object.assign(job, { status: "failed", message: error.message || "Model üretilemedi. Çekimlerin korundu." });
    } finally {
      if (job.abort.signal.aborted) await rm(directory, { recursive: true, force: true });
      else await persist(job);
    }
  }

  async function processAppearance(job) {
    const directory = join(root, job.id);
    try {
      const { model, bounds } = await appearance.run(join(directory, "input"), join(directory, "output"), directory, job.abort.signal);
      job.abort.signal.throwIfAborted();
      validateAppearanceFile(Uint8Array.from(model).buffer); validateAppearanceBounds(bounds);
      await writeFile(join(directory, "appearance.ply"), model, { mode: 0o600 });
      Object.assign(job, { appearanceStatus: "ready", appearanceBounds: bounds, appearanceMessage: "Gerçekçi görünümün hazır. Yansımaları ve eksik yüzeyleri fotoğraflarınla kontrol et." });
    } catch {
      if (!job.abort.signal.aborted) Object.assign(job, { appearanceStatus: "failed", appearanceMessage: "Gerçekçi görünüm hazırlanamadı. 3D geometrin ve çekimlerin korundu." });
    } finally {
      if (job.abort.signal.aborted) await rm(directory, { recursive: true, force: true });
      else await persist(job);
    }
  }

  const server = createServer(async (request, response) => {
    const json = (status, data) => { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify(data)); };
    // Loopback-only service; reject unapproved website origins before parsing any body.
    if (request.headers.origin !== origin) return json(403, { message: "Bu kaynaktan erişime izin verilmiyor." });
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return response.writeHead(204).end();
    }
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    try {
      if (request.method === "GET" && pathname === "/health") return json(200, { available: worker.available, appearanceAvailable: appearance.available, message: worker.available ? "Yerel model üretimi hazır." : "Bu bilgisayarda model üretimi kullanılamıyor. Çekimlerini yine de hazırlayabilirsin." });
      if (request.method === "POST" && pathname === "/jobs") {
        if (!worker.available) throw failure("Model üretim servisi bu bilgisayarda kullanılamıyor.", 503);
        if (accepting || [...jobs.values()].some((job) => ["processing", "converting"].includes(job.status) || job.appearanceStatus === "processing")) throw failure("Başka bir tarama işleniyor. Tamamlanınca yeniden dene.", 409);
        if (jobs.size >= 5) throw failure("Yerel tarama alanı dolu. Önce eski bir taramayı sil.", 409);
        if (Number(request.headers["content-length"] || 0) > MAX_SCAN_BYTES) throw failure("Çekim en fazla 512 MB olabilir.", 413);
        accepting = true;
        const id = randomUUID();
        const directory = join(root, id);
        await mkdir(join(directory, "input"), { recursive: true, mode: 0o700 });
        let capture;
        let uploadError;
        const files = new Map();
        const writes = [];
        try {
          await mkdir(join(directory, "originals"), { mode: 0o700 });
          const parser = Busboy({ headers: request.headers, limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_CAPTURE_PHOTOS, fields: 1, fieldSize: 32000, parts: MAX_CAPTURE_PHOTOS + 1 } });
          let bytes = 0;
          const countBytes = (chunk) => { bytes += chunk.length; if (bytes > MAX_SCAN_BYTES) { uploadError = failure("Çekim en fazla 512 MB olabilir.", 413); request.destroy(); } };
          request.on("data", countBytes);
          request.setTimeout(120000, () => request.destroy());
          parser.on("field", (name, value, info) => {
            try { if (name !== "capture" || info.valueTruncated) throw new Error(); capture = JSON.parse(value); validateCapture(capture); }
            catch (error) { uploadError = failure(error.message || "Çekim bilgileri okunamadı."); }
          });
          parser.on("file", (name, stream, info) => {
            if (!validId(name) || files.has(name) || !["image/jpeg", "image/png"].includes(info.mimeType)) { uploadError = failure("JPG veya PNG fotoğraflar ve geçerli çekim bilgileri gerekli."); stream.resume(); return; }
            const path = join(directory, "input", `${name}.${info.mimeType === "image/png" ? "png" : "jpg"}`);
            files.set(name, path);
            stream.on("limit", () => { uploadError = failure("Her fotoğraf en fazla 12 MB olabilir.", 413); });
            writes.push(pipeline(stream, createWriteStream(path, { mode: 0o600 })).catch((error) => { uploadError = error; }));
          });
          for (const limit of ["filesLimit", "fieldsLimit", "partsLimit"]) parser.on(limit, () => { uploadError = failure("Çekim dosya sınırı aşıldı.", 413); });
          await pipeline(request, parser);
          await Promise.all(writes);
          request.removeListener("data", countBytes);
          if (uploadError) throw uploadError;
          validateCapture(capture);
          if (files.size !== capture.length || capture.some((photo) => !files.has(photo.id))) throw failure("Çekim bilgileri ve fotoğraflar eşleşmiyor.");
          const hashes = new Set();
          for (const photo of capture) {
            const file = await readFile(files.get(photo.id));
            const hash = createHash("sha256").update(file).digest("hex");
            if (hashes.has(hash)) throw failure("Aynı fotoğraf birden fazla açı için kullanılamaz.");
            hashes.add(hash);
            const metadata = await sharp(file, { limitInputPixels: 80_000_000 }).metadata();
            if (!["jpeg", "png"].includes(metadata.format) || Math.min(metadata.width || 0, metadata.height || 0) < 900 || Math.max(metadata.width || 0, metadata.height || 0) < 1600) throw failure("Fotoğraflar en az 1600 × 900 piksel olmalı.");
            // Keep originals byte-for-byte; normalize phone EXIF orientation before
            // estimating poses so masks and training pixels share one coordinate frame.
            const original = join(directory, "originals", basename(files.get(photo.id)));
            await rename(files.get(photo.id), original);
            const target = join(directory, "input", `${String(capture.indexOf(photo)).padStart(4, "0")}.${metadata.format === "png" ? "png" : "jpg"}`);
            if (metadata.orientation && metadata.orientation !== 1) {
              await sharp(original, { limitInputPixels: 80_000_000 }).rotate().withMetadata({ orientation: 1 }).toFormat(metadata.format === "png" ? "png" : "jpeg", metadata.format === "png" ? {} : { quality: 98, chromaSubsampling: "4:4:4" }).toFile(target);
              await chmod(target, 0o600);
            } else await link(original, target);
          }
          const job = { id, created: Date.now(), status: "processing", progress: 0, message: "Fotoğraflar eşleştiriliyor, geometri oluşturuluyor.", warnings: 0, abort: new AbortController() };
          await persist(job);
          jobs.set(id, job);
          void processJob(job).catch(() => { job.status = "failed"; job.message = "İşlem kaydedilemedi. Yeniden deneyebilirsin."; });
          return json(202, publicJob(job));
        } catch (error) {
          await Promise.allSettled(writes);
          await rm(directory, { recursive: true, force: true });
          throw error;
        } finally { accepting = false; }
      }
      const match = /^\/jobs\/([a-f0-9-]{36})(\/model|\/appearance)?$/.exec(pathname);
      const job = match && jobs.get(match[1]);
      if (!job) throw failure("Tarama bulunamadı veya süresi doldu. Çekimlerinle yeniden başlayabilirsin.", 404);
      if (Date.now() - job.created > lifetime) {
        job.abort.abort(); jobs.delete(job.id);
        await rm(join(root, job.id), { recursive: true, force: true });
        throw failure("Taramanın 24 saatlik saklama süresi doldu.", 410);
      }
      if (request.method === "GET" && !match[2]) return json(200, publicJob(job));
      if (request.method === "POST" && match[2] === "/appearance") {
        if (!appearance.available) throw failure("Gerçekçi görünüm işleyicisi bu Mac’te kullanılamıyor.", 503);
        if (job.status !== "ready") throw failure("Önce 3D geometrinin tamamlanması gerekli.", 409);
        if (accepting || [...jobs.values()].some((item) => ["processing", "converting"].includes(item.status) || item.appearanceStatus === "processing")) throw failure("Başka bir tarama işleniyor. Tamamlanınca yeniden dene.", 409);
        if (job.appearanceStatus === "ready") return json(200, publicJob(job));
        Object.assign(job, { appearanceStatus: "processing", appearanceMessage: "Fotoğraflarından gerçekçi görünüm öğreniliyor. Bu işlem geometri üretiminden daha uzun sürebilir." });
        await persist(job);
        void processAppearance(job).catch(() => { job.appearanceStatus = "failed"; job.appearanceMessage = "İşlem kaydedilemedi. Geometrin korundu."; });
        return json(202, publicJob(job));
      }
      if (request.method === "GET" && match[2] === "/appearance") {
        if (job.appearanceStatus !== "ready") throw failure("Gerçekçi görünüm henüz hazır değil.", 409);
        const buffer = await readFile(join(root, job.id, "appearance.ply"));
        response.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": buffer.length, "Cache-Control": "no-store" });
        return response.end(buffer);
      }
      if (request.method === "GET" && match[2] === "/model") {
        if (job.status !== "ready") throw failure("Model henüz hazır değil.", 409);
        const buffer = await readFile(join(root, job.id, "model.glb"));
        response.writeHead(200, { "Content-Type": "model/gltf-binary", "Content-Length": buffer.length, "Cache-Control": "no-store" });
        return response.end(buffer);
      }
      if (request.method === "DELETE" && !match[2]) {
        const running = ["processing", "converting"].includes(job.status) || job.appearanceStatus === "processing";
        job.abort.abort(); jobs.delete(job.id);
        if (!running) await rm(join(root, job.id), { recursive: true, force: true });
        return json(200, { removed: true });
      }
      throw failure("Bu işlem desteklenmiyor.", 405);
    } catch (error) {
      if (!response.headersSent && !response.destroyed) json(error.status || 400, { message: error.status ? error.message : "Çekim işlenemedi. Dosyaları kontrol edip yeniden dene." });
    }
  });
  server.requestTimeout = 180000;
  server.on("close", () => { clearInterval(retention); jobs.forEach((job) => job.abort.abort()); });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await reconstructionServer();
  server.listen(4180, "127.0.0.1", () => console.log("Yerel 3D üretimi: http://127.0.0.1:4180"));
}
