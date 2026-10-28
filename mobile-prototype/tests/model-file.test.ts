import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateModelFile } from "../src/model-file.ts";

function glb(manifest: unknown) {
  const json = Buffer.from(JSON.stringify(manifest));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const buffer = new ArrayBuffer(20 + paddedLength);
  const view = new DataView(buffer);
  [0x46546c67, 2, buffer.byteLength, paddedLength, 0x4e4f534a].forEach((value, index) => view.setUint32(index * 4, value, true));
  new Uint8Array(buffer, 20).fill(32);
  new Uint8Array(buffer, 20, json.length).set(json);
  return buffer;
}

test("the shipped SUV is a valid self-contained model", () => {
  const bytes = readFileSync(new URL("../public/assets/models/demo-suv.glb", import.meta.url));
  assert.doesNotThrow(() => validateModelFile(Uint8Array.from(bytes).buffer));
});

test("truncated or non-GLB uploads are rejected before parsing", () => {
  assert.throws(() => validateModelFile(new ArrayBuffer(8)), /GLB 2.0/);
  const buffer = glb({ scenes: [{}] });
  new DataView(buffer).setUint32(8, 999, true);
  assert.throws(() => validateModelFile(buffer), /GLB 2.0/);
});

test("models requiring remote assets are rejected", () => {
  for (const resource of [{ images: [{ uri: "https://example.com/image.png" }] }, { buffers: [{ uri: "mesh.bin" }] }]) {
    assert.throws(() => validateModelFile(glb({ scenes: [{}], ...resource })), /tek bir GLB/);
  }
});

test("oversized and excessive-complexity models are rejected", () => {
  assert.throws(() => validateModelFile(new ArrayBuffer(20 * 1024 * 1024 + 1)), /20 MB/);
  assert.throws(() => validateModelFile(glb({ scenes: [{}], accessors: [{ count: 3_000_001 }] })), /fazla ayrıntılı/);
});

test("malformed collections and empty scenes give actionable errors", () => {
  assert.throws(() => validateModelFile(glb({ scenes: [] })), /sahne yok/);
  assert.throws(() => validateModelFile(glb({ scenes: [{}], images: {} })), /geçerli bir GLB/);
});
