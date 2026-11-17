import { test } from "node:test";
import assert from "node:assert/strict";
import { tourFrames, tourFrameIndex } from "../src/photo-tour.ts";

test("tour preserves originals and within-angle capture order without mixing heights", () => {
  const photos = [
    { id: "rear-1", angle: 4, pass: 0, url: "blob:rear-1", name: "rear-1.jpg" },
    { id: "front-1", angle: 0, pass: 0, url: "blob:front-1", name: "front-1.jpg" },
    { id: "high", angle: 0, pass: 1, url: "blob:high", name: "high.jpg" },
    { id: "front-2", angle: 0, pass: 0, url: "blob:front-2", name: "front-2.jpg" },
  ];
  const originalOrder = photos.map((photo) => photo.id);
  const frames = tourFrames(photos, 0);
  assert.deepEqual(frames.map((photo) => photo.id), ["front-1", "front-2", "rear-1"]);
  assert.strictEqual(frames[0], photos[1]);
  assert.deepEqual(photos.map((photo) => photo.id), originalOrder);
  assert.deepEqual(tourFrames(photos, 2), []);
});

test("complete tours wrap both ways; partial tours stop at available endpoints", () => {
  assert.equal(tourFrameIndex(-1, 48, true), 47);
  assert.equal(tourFrameIndex(48, 48, true), 0);
  assert.equal(tourFrameIndex(97, 48, true), 1);
  assert.equal(tourFrameIndex(-1, 12, false), 0);
  assert.equal(tourFrameIndex(12, 12, false), 11);
  assert.equal(tourFrameIndex(0, 0, false), 0);
});
