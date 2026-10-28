import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { captureCompletion, sectionCounts, validateCapture } from "../src/capture-policy.ts";

const complete = () => Array.from({ length: 64 }, (_, index) => ({ id: randomUUID(), pass: Math.floor(index / 32), angle: Math.floor(index % 32 / 4) }));
test("both complete passes are required; excess shots cannot fill missing angles", () => {
  const photos = complete();
  assert.equal(captureCompletion(photos), 64);
  assert.deepEqual(sectionCounts(photos, 0), Array(8).fill(4));
  assert.doesNotThrow(() => validateCapture(photos));
  const missing = photos.map((photo) => ({ ...photo, pass: 0 }));
  assert.equal(captureCompletion(missing), 32);
  assert.throws(() => validateCapture(missing), /iki turda/);
});
test("duplicate IDs, invalid angles and malformed captures are rejected", () => {
  const photos = complete();
  assert.throws(() => validateCapture([...photos, photos[0]]), /geçerli değil/);
  assert.throws(() => validateCapture([{ ...photos[0], angle: -1 }]), /geçerli değil/);
  assert.throws(() => validateCapture(Array.from({ length: 161 }, () => photos[0])), /160/);
});
