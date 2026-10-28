import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { reconstructionServer } from "../server/reconstruction.mjs";
import { validateModelFile } from "../src/model-file.ts";

const origin = "http://127.0.0.1:4173";
async function setup(t, engine) {
  const root = await mkdtemp(join(tmpdir(), "sattim-reconstruction-test-"));
  const server = await reconstructionServer({ root, engine });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  return { root, request: (path, options = {}) => fetch(base + path, { ...options, headers: { Origin: origin, ...options.headers } }) };
}
async function captureForm(duplicate = false) {
  const photos = Array.from({ length: 64 }, (_, i) => ({ id: randomUUID(), pass: Math.floor(i / 32), angle: Math.floor(i % 32 / 4) }));
  const form = new FormData();
  form.set("capture", JSON.stringify(photos));
  for (const [index, photo] of photos.entries()) {
    const image = await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: duplicate ? 100 : index * 3, g: 90, b: 120 } } }).jpeg().toBuffer();
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
    assert.equal((await readdir(input)).length, 64);
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
