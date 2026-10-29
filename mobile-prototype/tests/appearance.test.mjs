import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { assessCameraCoverage, cameraFrame, cropAppearanceModel, nativeGeometryBounds, prepareAppearance } from "../server/appearance.mjs";
import { validateAppearanceFile, validateAppearanceBounds, MAX_APPEARANCE_BYTES } from "../src/appearance-file.ts";
import { gaussianFixture, fixtureBounds } from "./appearance-fixture.mjs";
const arrayBuffer = (buffer) => Uint8Array.from(buffer).buffer;

test("matched-photo counts cannot hide missing sides or a single-height capture", () => {
  const cameras = (arc = Math.PI * 2, heights = true) => Array.from({ length: 48 }, (_, i) => ({
    position: [Math.sin(i / 48 * arc) * 5, heights && i % 2 ? 3 : .5, Math.cos(i / 48 * arc) * 5],
  }));
  const complete = assessCameraCoverage(cameras(), fixtureBounds);
  assert.equal(complete.needsMoreViews, false);
  assert.ok(Math.abs(complete.largestGapDegrees - 7.5) < 1e-6);
  assert.equal(assessCameraCoverage(cameras(Math.PI), fixtureBounds).needsMoreViews, true);
  assert.equal(assessCameraCoverage(cameras(Math.PI * 2, false), fixtureBounds).needsMoreViews, true);
  assert.throws(() => assessCameraCoverage([{ position: [NaN, 0, 0] }, ...cameras()], fixtureBounds));
});

test("photo-estimated camera retains OpenGL camera-to-world orientation and calibration", () => {
  const camera = { file: "0000.jpg", position: [1, 2, 3], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2], intrinsics: [1300, 1300, 960, 720] };
  const frame = cameraFrame(camera, 1920, 1440);
  assert.equal(frame.file_path, "images/0000.jpg");
  assert.deepEqual([frame.fl_x, frame.fl_y, frame.cx, frame.cy], camera.intrinsics);
  assert.ok(Math.abs(frame.transform_matrix[0][2] - 1) < 1e-6);
  assert.ok(Math.abs(frame.transform_matrix[2][0] + 1) < 1e-6);
  assert.deepEqual(frame.transform_matrix.map((row) => row[3]), [1, 2, 3, 1]);
  assert.throws(() => cameraFrame({ ...camera, intrinsics: [NaN, 1, 2, 3] }, 1920, 1440));
  assert.throws(() => cameraFrame({ ...camera, rotation: [0, 0, 0, 0] }, 1920, 1440));
});

test("PLY rejects corrupt data, non-finite numbers, excessive sizes and unsupported formats", () => {
  const model = gaussianFixture();
  assert.equal(validateAppearanceFile(arrayBuffer(model)), 1002);
  assert.throws(() => validateAppearanceFile(arrayBuffer(model.subarray(0, -4))));
  assert.throws(() => validateAppearanceFile(new ArrayBuffer(MAX_APPEARANCE_BYTES + 1)));
  const corrupt = Buffer.from(model); corrupt.writeFloatLE(NaN, corrupt.length - 4);
  assert.throws(() => validateAppearanceFile(arrayBuffer(corrupt)));
  assert.throws(() => validateAppearanceFile(arrayBuffer(Buffer.from("ply\nformat ascii 1.0\n"))));
  assert.throws(() => validateAppearanceBounds({ min: [0, 0, 0], max: [0, 1, 1] }));
});

test("background cropping removes outside points without rewriting retained appearance coefficients", () => {
  const model = gaussianFixture(1002), end = model.indexOf("end_header\n") + 11;
  model.writeFloatLE(20, end); // One background point outside the native mesh.
  const cropped = cropAppearanceModel(model, fixtureBounds);
  assert.equal(validateAppearanceFile(arrayBuffer(cropped)), 1001);
  const croppedEnd = cropped.indexOf("end_header\n") + 11;
  assert.deepEqual(cropped.subarray(croppedEnd), model.subarray(end + 14 * 4));
});

test("surface cleanup discards distant, oversized and almost transparent Gaussians", () => {
  const model = gaussianFixture(1004), end = model.indexOf("end_header\n") + 11, stride = 14 * 4;
  model.writeFloatLE(1.5, end + 2 * 4); // Within bounding box, away from the body.
  model.writeFloatLE(4, end + stride + 4 * 4); // Excessively large radius.
  model.writeFloatLE(-20, end + 2 * stride + 3 * 4); // Negligible opacity.
  const cleaned = cropAppearanceModel(model, fixtureBounds, [[0, .5, 0]]);
  assert.equal(validateAppearanceFile(arrayBuffer(cleaned)), 1001);
  assert.deepEqual(cleaned.subarray(cleaned.indexOf("end_header\n") + 11), model.subarray(end + 3 * stride));
});

test("framing uses actual reconstructed vertices, rather than the padded capture volume", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "sattim-bounds-")); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "car.obj"), "v -1 0 -2\nv 1 1 2\nv 0 0 1\nvt 999 999\n");
  assert.deepEqual(await nativeGeometryBounds(root), fixtureBounds);
});

test("foreground training keeps original photos and rescales calibration with transparent PNGs", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "sattim-alpha-")); t.after(() => rm(root, { recursive: true, force: true }));
  const input = join(root, "input"), output = join(root, "output"), masks = join(root, "masks"), training = join(root, "training");
  await Promise.all([input, output, masks].map((directory) => mkdir(directory)));
  const photo = await sharp({ create: { width: 1920, height: 1440, channels: 3, background: "#a72d19" } }).jpeg().toBuffer();
  const maskPixels = Buffer.alloc(1280 * 960);
  for (let y = 0; y < 960; y++) maskPixels.fill(255, y * 1280, y * 1280 + 640);
  const mask = await sharp(maskPixels, { raw: { width: 1280, height: 960, channels: 1 } }).png().toBuffer();
  const cameras = [];
  for (let i = 0; i < 32; i++) {
    const file = `${String(i).padStart(4, "0")}.jpg`;
    await writeFile(join(input, file), photo); await writeFile(join(masks, `${file}.png`), mask);
    cameras.push({ file, position: [0, 0, 1], rotation: [0, 0, 0, 1], intrinsics: [1300, 1300, 960, 720] });
  }
  await writeFile(join(output, "cameras.json"), JSON.stringify(cameras)); await writeFile(join(output, "sparse.ply"), "unit-test seed");
  assert.equal(await prepareAppearance(input, output, training, masks), 32);
  assert.deepEqual(await readFile(join(input, "0000.jpg")), photo);
  const frame = JSON.parse(await readFile(join(training, "transforms.json"))).frames[0];
  assert.deepEqual([frame.w, frame.h, frame.cx, frame.cy], [1280, 960, 640, 480]);
  assert.ok(Math.abs(frame.fl_x - 1300 * 2 / 3) < 1e-9);
  const { data, info } = await sharp(join(training, frame.file_path)).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4); assert.equal(data[3], 255); assert.equal(data[(1279 * 4) + 3], 0);
  assert.ok(Math.abs(data[0] - 167) < 3);
});
