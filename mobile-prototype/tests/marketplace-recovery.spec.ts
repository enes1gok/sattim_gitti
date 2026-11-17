import { expect, test } from "@playwright/test";

for (const device of ["iphone", "pixel-10"] as const) {
  test(`${device}: budget recovery explains the gap and preserves matching criteria`, async ({ page }) => {
    await page.goto("/?demo=1");
    if (device === "pixel-10") {
      await page.getByTestId("device-picker").click();
      await page.getByTestId("device-option-pixel-10").click();
    }
    await page.getByRole("button", { name: /^Filtreler/ }).click();
    await page.getByRole("button", { name: "1 milyon ₺'ye kadar", exact: true }).click();
    await page.getByRole("button", { name: "İstanbul", exact: true }).click();
    await page.getByRole("button", { name: "Aile arabası", exact: true }).click();
    await page.getByRole("button", { name: "Sonuçları göster" }).click();
    const empty = page.locator(".search-empty");
    await expect(empty).toContainText("1.685.000 ₺");
    await expect(empty).toContainText("685.000 ₺ daha yüksek");
    await expect(empty.locator("li")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Bütçe filtresini kaldır" })).toContainText("1 milyon");
    await empty.getByRole("button", { name: /Değişiklikleri uygula/ }).click();
    await expect(page.locator(".market-listing")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bütçe filtresini kaldır" })).toContainText("2 milyon");
    await expect(page.getByRole("button", { name: "Konum filtresini kaldır" })).toContainText("İstanbul");
    await expect(page.getByRole("button", { name: "İhtiyaç filtresini kaldır" })).toContainText("Aile arabası");
    await page.reload();
    await page.getByRole("button", { name: /aramana devam et/i }).click();
    await expect(page.locator(".market-listing")).toBeVisible();
  });
}

test("recovery explains all blockers before promising a result", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.getByRole("textbox", { name: "Marka, model veya kelime ara" }).fill("Toyota");
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  for (const name of ["1 milyon ₺'ye kadar", "Ankara", "Manuel", "Sedan", "Büyük bagaj"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Sonuçları göster" }).click();
  const changes = page.locator(".search-recovery-changes");
  await expect(changes.locator("li")).toHaveCount(6);
  for (const text of ["685.000 ₺", "Ankara", "Manuel", "Sedan", "Toyota", "Büyük bagaj"]) {
    await expect(changes).toContainText(text);
  }
  await page.getByRole("button", { name: /Değişiklikleri uygula/ }).click();
  await expect(page.locator(".market-listing")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("");
  await expect(page.locator(".search-empty")).toHaveCount(0);
});

test("dismissing budget drafts and resetting empty results preserve search semantics", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByRole("button", { name: "1 milyon ₺'ye kadar", exact: true }).click();
  await page.getByRole("button", { name: "Paneli kapat" }).click();
  await page.getByRole("button", { name: "Araç ara", exact: true }).click();
  await expect(page.locator(".market-listing")).toBeVisible();
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByRole("button", { name: "1 milyon ₺'ye kadar", exact: true }).click();
  await page.getByRole("button", { name: "Sonuçları göster" }).click();
  await page.getByRole("button", { name: "Aramayı sıfırla" }).click();
  await expect(page.locator(".market-listing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bütçe filtresini kaldır" })).toHaveCount(0);
});
