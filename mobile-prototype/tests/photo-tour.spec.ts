import { expect, test } from "@playwright/test";

test("original frames rotate, wrap, zoom and switch heights without loading 3D", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/tests/tour-fixture.html");
  await expect(page.getByRole("heading", { name: "HD 360° fotoğraf turu" })).toBeVisible();
  const image = page.locator(".tour-stage > img");
  await expect(image).toHaveAttribute("src", /fixture=0$/);
  await page.getByRole("button", { name: "Önceki kare", exact: true }).click();
  await expect(image).toHaveAttribute("src", /fixture=47$/);
  await page.getByRole("button", { name: "Sonraki kare", exact: true }).click();
  await expect(image).toHaveAttribute("src", /fixture=0$/);
  await page.getByRole("button", { name: "Fotoğrafı yakınlaştır" }).click();
  await expect(image).toHaveAttribute("style", /scale\(2\)/);
  const stage = page.locator(".tour-stage");
  await stage.press("Escape");
  await stage.press("ArrowRight");
  await expect(image).toHaveAttribute("src", /fixture=1$/);
  await page.getByRole("button", { name: "Yüksek açı", exact: true }).click();
  await expect(image).toHaveAttribute("src", /fixture=48$/);
  await expect(page.getByRole("link", { name: "Orijinal fotoğrafı indir" })).toHaveAttribute("download", "fixture-48.png");
  const box = await stage.boundingBox();
  if (!box) throw new Error("Tour stage missing");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 32, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(image).toHaveAttribute("src", /fixture=52$/);
  expect(requests.some((url) => /Vehicle3D|VehicleAppearance|4180/.test(url))).toBe(false);
});

test("incomplete tours are labelled and never wrap across the missing circumference", async ({ page }) => {
  await page.goto("/tests/tour-fixture.html");
  await page.getByRole("button", { name: "Eksik / tam tur" }).click();
  await expect(page.getByRole("heading", { name: "Fotoğraf önizlemesi" })).toBeVisible();
  await expect(page.getByText("1 / 8 yön tamamlandı.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Önceki kare", exact: true })).toBeDisabled();
  await page.locator(".tour-stage").press("End");
  await expect(page.locator(".tour-stage > img")).toHaveAttribute("src", /fixture=5$/);
  await expect(page.getByRole("button", { name: "Sonraki kare", exact: true })).toBeDisabled();
});

test("a missing original gives a retry path and cannot silently substitute a model", async ({ page }) => {
  await page.route("**/assets/car-front.png?fixture=0", (route) => route.abort());
  await page.goto("/tests/tour-fixture.html");
  await expect(page.getByRole("alert")).toContainText("Fotoğraf açılamadı");
  await page.unroute("**/assets/car-front.png?fixture=0");
  await page.getByRole("button", { name: "Yeniden dene" }).click();
  await expect(page.locator(".tour-stage > img")).toHaveAttribute("src", /fixture=0$/);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a saved first pass opens in the app with the reconstruction service offline", async ({ page }) => {
  await page.route("http://127.0.0.1:4180/**", (route) => route.abort());
  await page.goto("/tests/tour-fixture.html");
  await page.evaluate(async () => {
    const blob = await fetch("/assets/car-front.png").then((response) => response.blob());
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("sattim-gitti-scan", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("draft");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const photos = Array.from({ length: 48 }, (_, index) => ({ id: crypto.randomUUID(), angle: Math.floor(index / 6), pass: 0, hash: `fixture-${index}`, warning: "", file: new File([blob], `tour-fixture-${index}.png`, { type: "image/png" }) }));
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("draft", "readwrite");
      transaction.objectStore("draft").put({ photos }, "current");
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Araç sat", exact: true }).click();
  await page.getByRole("button", { name: "Kendi fotoğraf turumu aç" }).click();
  await expect(page.getByRole("heading", { name: "HD 360° fotoğraf turu" })).toBeVisible();
  await expect(page.locator(".tour-stage > img")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("button", { name: "Ek 3D görünümü aç" })).toHaveCount(0);
  await page.getByRole("button", { name: "Paneli kapat", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Araç sat", exact: true }).click();
  await page.getByRole("button", { name: "Kendi fotoğraf turumu aç" }).click();
  await expect(page.getByRole("heading", { name: "HD 360° fotoğraf turu" })).toBeVisible();
});
