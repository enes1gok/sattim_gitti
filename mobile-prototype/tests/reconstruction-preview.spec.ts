import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

import { gaussianFixture, fixtureBounds } from "./appearance-fixture.mjs";

const geometry = readFileSync(new URL("../public/assets/models/demo-suv.glb", import.meta.url));

test("optional appearance failures preserve usable geometry and explain the fallback", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  await page.route("http://127.0.0.1:4180/jobs/preview/model", (route) => route.fulfill({ body: geometry, contentType: "model/gltf-binary", headers: { "access-control-allow-origin": "*" } }));
  for (const failure of ["network", "invalid-file"]) {
    await page.route("http://127.0.0.1:4180/jobs/preview/appearance", (route) => failure === "network" ? route.abort() : route.fulfill({ body: "broken PLY", headers: { "access-control-allow-origin": "*" } }));
    const result = await page.evaluate(async () => {
      // @ts-expect-error Vite serves application modules directly in browser tests.
      const { loadReconstructionPreview } = await import("/src/reconstruction-client.ts");
      const model = await loadReconstructionPreview({ id: "preview", status: "ready", appearanceStatus: "ready", appearanceBounds: { min: [-1, 0, -1], max: [1, 1, 1] } });
      return { bytes: model.buffer.byteLength, appearance: !!model.appearance, warning: model.warning };
    });
    expect(result.bytes).toBe(geometry.byteLength);
    expect(result.appearance).toBe(false);
    expect(result.warning).toContain("3D geometri açıldı");
    await page.unroute("http://127.0.0.1:4180/jobs/preview/appearance");
  }
});

test("geometry-only requests skip appearance and invalid geometry remains an error", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  let appearanceRequests = 0;
  await page.route("http://127.0.0.1:4180/jobs/preview/appearance", (route) => { appearanceRequests++; return route.abort(); });
  await page.route("http://127.0.0.1:4180/jobs/preview/model", (route) => route.fulfill({ body: geometry, headers: { "access-control-allow-origin": "*" } }));
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite serves application modules directly in browser tests.
    const { loadReconstructionPreview } = await import("/src/reconstruction-client.ts");
    const model = await loadReconstructionPreview({ id: "preview", status: "ready", appearanceStatus: "ready" }, true);
    return { bytes: model.buffer.byteLength, warning: model.warning };
  });
  expect(result).toEqual({ bytes: geometry.byteLength, warning: undefined });
  expect(appearanceRequests).toBe(0);
  await page.unroute("http://127.0.0.1:4180/jobs/preview/model");
  await page.route("http://127.0.0.1:4180/jobs/preview/model", (route) => route.fulfill({ body: "invalid GLB", headers: { "access-control-allow-origin": "*" } }));
  const error = await page.evaluate(async () => {
    // @ts-expect-error Vite serves application modules directly in browser tests.
    const { loadReconstructionPreview } = await import("/src/reconstruction-client.ts");
    try { await loadReconstructionPreview({ id: "preview", status: "ready", appearanceStatus: "ready" }); }
    catch (reason) { return (reason as Error).message; }
  });
  expect(error).toContain("GLB 2.0");
  expect(appearanceRequests).toBe(0);
});

test("ready appearance is returned alongside validated geometry", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const appearance = gaussianFixture();
  await page.route("http://127.0.0.1:4180/jobs/preview/model", (route) => route.fulfill({ body: geometry, headers: { "access-control-allow-origin": "*" } }));
  await page.route("http://127.0.0.1:4180/jobs/preview/appearance", (route) => route.fulfill({ body: appearance, headers: { "access-control-allow-origin": "*" } }));
  const result = await page.evaluate(async (bounds) => {
    // @ts-expect-error Vite serves application modules directly in browser tests.
    const { loadReconstructionPreview } = await import("/src/reconstruction-client.ts");
    const model = await loadReconstructionPreview({ id: "preview", status: "ready", appearanceStatus: "ready", appearanceBounds: bounds });
    return { geometryBytes: model.buffer.byteLength, appearanceBytes: model.appearance?.buffer.byteLength, bounds: model.appearance?.bounds, warning: model.warning };
  }, fixtureBounds);
  expect(result).toEqual({ geometryBytes: geometry.byteLength, appearanceBytes: appearance.byteLength, bounds: fixtureBounds, warning: undefined });
});
