import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { captureCompletion, sectionCounts, validateCapture } from "../src/capture-policy.ts";

const complete = () => Array.from({ length: 144 }, (_, index) => ({ id: randomUUID(), pass: Math.floor(index / 48), angle: Math.floor(index % 48 / 6) }));
test("three complete passes are required; excess shots cannot fill missing angles", () => {
  const photos = complete();
  assert.equal(captureCompletion(photos), 144);
  assert.deepEqual(sectionCounts(photos, 0), Array(8).fill(6));
  assert.doesNotThrow(() => validateCapture(photos));
  const missing = photos.map((photo) => ({ ...photo, pass: 0 }));
  assert.equal(captureCompletion(missing), 48);
  assert.throws(() => validateCapture(missing), /Üç turda/);
});
test("duplicate IDs, invalid angles and malformed captures are rejected", () => {
  const photos = complete();
  assert.throws(() => validateCapture([...photos, photos[0]]), /geçerli değil/);
  assert.throws(() => validateCapture([{ ...photos[0], angle: -1 }]), /geçerli değil/);
  assert.throws(() => validateCapture(Array.from({ length: 161 }, () => photos[0])), /160/);
});

test("legacy 64-shot drafts remain countable but need extra views; totals cannot fill a missing low angle", () => {
  const legacy = Array.from({ length: 64 }, (_, i) => ({ id: randomUUID(), pass: Math.floor(i / 32), angle: Math.floor(i % 32 / 4) }));
  assert.equal(captureCompletion(legacy), 64);
  assert.throws(() => validateCapture(legacy), /144/);
  const photos = complete().map((photo) => photo.pass === 2 && photo.angle === 7 ? { ...photo, angle: 6 } : photo);
  assert.equal(photos.length, 144);
  assert.equal(captureCompletion(photos), 138);
  assert.throws(() => validateCapture(photos), /144/);
});
