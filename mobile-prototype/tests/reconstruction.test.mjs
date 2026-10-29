import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { reconstructionServer } from "../server/reconstruction.mjs";
import { validateModelFile } from "../src/model-file.ts";
import { validateAppearanceFile } from "../src/appearance-file.ts";
import { gaussianFixture, fixtureBounds } from "./appearance-fixture.mjs";

const origin = "http://127.0.0.1:4173";
async function setup(t, engine, appearanceWorker = { available: false }) {
  const root = await mkdtemp(join(tmpdir(), "sattim-reconstruction-test-"));
  const server = await reconstructionServer({ root, engine, appearanceWorker });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  return { root, request: (path, options = {}) => fetch(base + path, { ...options, headers: { Origin: origin, ...options.headers } }) };
}
async function captureForm(duplicate = false, orientation) {
  const photos = Array.from({ length: 144 }, (_, i) => ({ id: randomUUID(), pass: Math.floor(i / 48), angle: Math.floor(i % 48 / 6) }));
  const form = new FormData();
  form.set("capture", JSON.stringify(photos));
  for (const [index, photo] of photos.entries()) {
    let processing = sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: duplicate ? 100 : (index % 80) * 3, g: duplicate ? 90 : 20 + Math.floor(index / 80) * 100, b: 120 } } }).jpeg();
    if (orientation && index === 0) processing = processing.withMetadata({ orientation });
    const image = await processing.toBuffer();
    form.append(photo.id, new Blob([image], { type: "image/jpeg" }), "test.jpg");
  }
  return form;
}

test("unapproved origins and unavailable hardware cannot start processing", async (t) => {
  const { request } = await setup(t, { available: false });
  assert.equal((await request("/health", { headers: { Origin: "https://unrelated.example" } })).status, 403);
  assert.equal((await (await request("/health")).json()).available, false);
  assert.equal((await request("/jobs", { method: "POST" })).status, 503);
});

test("incomplete capture and duplicate photos are rejected, temporary files removed", async (t) => {
  const { request, root } = await setup(t, { available: true });
  const incomplete = new FormData(); incomplete.set("capture", "[]");
  assert.equal((await request("/jobs", { method: "POST", body: incomplete })).status, 400);
  const repeated = await request("/jobs", { method: "POST", body: await captureForm(true) });
  assert.equal(repeated.status, 400);
  assert.match((await repeated.json()).message, /Aynı fotoğraf/);
  assert.deepEqual(await readdir(root), []);
});

test("adapter converts a test engine's OBJ into validated GLB and supports deletion", async (t) => {
  // This fixture tests the API/conversion contract, not photogrammetric accuracy.
  const { request, root } = await setup(t, { available: true, async run(input, output, update) {
    assert.equal((await readdir(input)).length, 144);
    update({ progress: .5 });
    await mkdir(output);
    await writeFile(join(output, "model.obj"), "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
  } });
  const accepted = await request("/jobs", { method: "POST", body: await captureForm() });
  assert.equal(accepted.status, 202);
  const job = await accepted.json();
  let status;
  for (let attempt = 0; attempt < 100; attempt++) {
    status = await (await request(`/jobs/${job.id}`)).json();
    if (status.status === "ready" || status.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(status.status, "ready", status.message);
  assert.equal(status.progress, 100);
  const model = await request(`/jobs/${job.id}/model`);
  assert.equal(model.status, 200);
  const buffer = await model.arrayBuffer();
  assert.doesNotThrow(() => validateModelFile(buffer));
  assert.equal((await request(`/jobs/${job.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await request(`/jobs/${job.id}`)).status, 404);
  assert.deepEqual(await readdir(root), []);
});

test("a running job rejects concurrent work and cancellation removes its files", async (t) => {
  let aborted = false;
  const { request, root } = await setup(t, { available: true, async run(_input, _output, update, signal) {
    update({ progress: .25 });
    await new Promise((_resolve, reject) => signal.addEventListener("abort", () => { aborted = true; reject(new Error("cancelled")); }, { once: true }));
  } });
  const job = await (await request("/jobs", { method: "POST", body: await captureForm() })).json();
  assert.equal((await request("/jobs", { method: "POST" })).status, 409);
  const status = await (await request(`/jobs/${job.id}`)).json();
  assert.equal(status.status, "processing");
  assert.equal(status.progress, 23);
  assert.equal((await request(`/jobs/${job.id}`, { method: "DELETE" })).status, 200);
  for (let attempt = 0; attempt < 100 && (await readdir(root)).length; attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(aborted, true);
  assert.deepEqual(await readdir(root), []);
});

test("worker failure cannot be reported as a ready model", async (t) => {
  const { request } = await setup(t, { available: true, async run() { throw new Error("Kareler eşleştirilemedi."); } });
  const job = await (await request("/jobs", { method: "POST", body: await captureForm() })).json();
  let status;
  for (let attempt = 0; attempt < 100; attempt++) {
    status = await (await request(`/jobs/${job.id}`)).json();
    if (status.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(status.status, "failed");
  assert.match(status.message, /eşleştirilemedi/);
  assert.equal((await request(`/jobs/${job.id}/model`)).status, 409);
});

test("portrait phone orientation is normalized for processing while original bytes are retained", async (t) => {
  const { request } = await setup(t, { available: true, async run(input, output) {
    const normalized = await sharp(join(input, "0000.jpg")).metadata();
    assert.deepEqual([normalized.width, normalized.height, normalized.orientation], [900, 1600, 1]);
    const originals = join(input, "..", "originals");
    const names = await readdir(originals); assert.equal(names.length, 144);
    const metadata = await Promise.all(names.map((name) => sharp(join(originals, name)).metadata()));
    const original = metadata.find((image) => image.orientation === 6);
    assert.deepEqual([original.width, original.height], [1600, 900]);
    await geometryEngine.run(input, output);
  } });
  const accepted = await request("/jobs", { method: "POST", body: await captureForm(false, 6) });
  assert.equal(accepted.status, 202);
  const job = await accepted.json();
  let status;
  for (let attempt = 0; attempt < 100; attempt++) {
    status = await (await request(`/jobs/${job.id}`)).json();
    if (["ready", "failed"].includes(status.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(status.status, "ready", status.message);
});

async function readyJob(request) {
  const job = await (await request("/jobs", { method: "POST", body: await captureForm() })).json();
  for (let attempt = 0; attempt < 100; attempt++) {
    const next = await (await request(`/jobs/${job.id}`)).json();
    if (next.status === "ready") return next;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Test geometry did not finish");
}
const geometryEngine = { available: true, async run(_input, output) {
  await mkdir(output); await writeFile(join(output, "model.obj"), "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
} };

test("appearance is generated separately; geometry remains available while it trains", async (t) => {
  let finish;
  const worker = { available: true, async run() { await new Promise((resolve) => { finish = resolve; }); return { model: gaussianFixture(), bounds: fixtureBounds }; } };
  const { request } = await setup(t, geometryEngine, worker);
  const job = await readyJob(request);
  assert.equal((await request(`/jobs/${job.id}/appearance`, { method: "POST" })).status, 202);
  assert.equal((await request(`/jobs/${job.id}/model`)).status, 200);
  assert.equal((await request(`/jobs/${job.id}/appearance`)).status, 409);
  assert.equal((await request("/jobs", { method: "POST" })).status, 409);
  assert.equal((await request(`/jobs/${job.id}/appearance`, { method: "POST" })).status, 409);
  finish();
  let status;
  for (let attempt = 0; attempt < 100; attempt++) {
    status = await (await request(`/jobs/${job.id}`)).json();
    if (status.appearanceStatus === "ready") break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(status.appearanceStatus, "ready"); assert.equal(status.status, "ready");
  assert.deepEqual(status.appearanceBounds, fixtureBounds);
  const model = await request(`/jobs/${job.id}/appearance`);
  assert.equal(validateAppearanceFile(await model.arrayBuffer()), 1002);
});

test("appearance failure preserves the valid geometry and reports the failure", async (t) => {
  const { request } = await setup(t, geometryEngine, { available: true, async run() { throw new Error("training failed"); } });
  const job = await readyJob(request);
  await request(`/jobs/${job.id}/appearance`, { method: "POST" });
  let status;
  for (let attempt = 0; attempt < 100; attempt++) {
    status = await (await request(`/jobs/${job.id}`)).json();
    if (status.appearanceStatus === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(status.appearanceStatus, "failed"); assert.equal(status.status, "ready");
  assert.equal((await request(`/jobs/${job.id}/model`)).status, 200);
  assert.equal((await request(`/jobs/${job.id}/appearance`)).status, 409);
});

test("deleting a scan aborts appearance processing and removes its copies", async (t) => {
  let aborted = false;
  const { request, root } = await setup(t, geometryEngine, { available: true, async run(_input, _output, _directory, signal) {
    await new Promise((_resolve, reject) => signal.addEventListener("abort", () => { aborted = true; reject(new Error("cancelled")); }, { once: true }));
  } });
  const job = await readyJob(request);
  await request(`/jobs/${job.id}/appearance`, { method: "POST" });
  assert.equal((await request(`/jobs/${job.id}`, { method: "DELETE" })).status, 200);
  for (let attempt = 0; attempt < 100 && (await readdir(root)).length; attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(aborted, true); assert.deepEqual(await readdir(root), []);
});
