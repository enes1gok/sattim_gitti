import { test } from "node:test";
import assert from "node:assert/strict";
import { captureCameraStill } from "../src/camera-still.ts";

function browser(t, ImageCapture) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const preview = new Blob(["preview"], { type: "image/jpeg" });
  let draws = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { ImageCapture } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement() {
    return { getContext: () => ({ drawImage() { draws++; } }), toBlob: (done) => done(preview) };
  } } });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else delete globalThis.window;
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else delete globalThis.document;
  });
  return { preview, draws: () => draws };
}
const video = { videoWidth: 3840, videoHeight: 2160 };
const track = { readyState: "live" };

test("native still bytes are preserved instead of being re-encoded from video", async (t) => {
  const original = new Blob(["camera JPEG with metadata"], { type: "image/jpeg" });
  const env = browser(t, class {
    async getPhotoCapabilities() { return { imageWidth: { max: 6000 } }; }
    async takePhoto(settings) { assert.equal(settings.imageWidth, 4096); return original; }
  });
  assert.equal(await captureCameraStill(video, track), original);
  assert.equal(env.draws(), 0);
});

test("a browser exposing an unsupported still API can continue through video", async (t) => {
  const env = browser(t, class { async takePhoto() { throw new Error("unsupported camera"); } });
  assert.equal(await captureCameraStill(video, track), env.preview);
  assert.equal(env.draws(), 1);
});

test("unsupported still image formats are not silently passed into the JPG/PNG pipeline", async (t) => {
  const env = browser(t, class { async takePhoto() { return new Blob(["HEIC"], { type: "image/heic" }); } });
  assert.equal(await captureCameraStill(video, track), env.preview);
});

test("Safari-style video fallback rejects a frame before video dimensions exist", async (t) => {
  browser(t, undefined);
  await assert.rejects(captureCameraStill({ videoWidth: 0, videoHeight: 0 }), /hazır değil/);
});
