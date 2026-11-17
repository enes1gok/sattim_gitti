import { expect, test } from "@playwright/test";

for (const device of ["iphone", "pixel-10"] as const) {
  test(`${device}: condition preferences exclude unknown history and remain in followed searches`, async ({ page }) => {
    await page.goto("/?demo=1");
    if (device === "pixel-10") {
      await page.getByTestId("device-picker").click();
      await page.getByTestId("device-option-pixel-10").click();
    }
    await page.getByRole("button", { name: /^Filtreler/ }).click();
    await page.getByRole("button", { name: "Boyasız", exact: true }).click();
    await page.getByRole("button", { name: "Değişensiz", exact: true }).click();
    await page.getByRole("button", { name: "Sonuçları göster" }).click();
    await expect(page.locator(".search-empty")).toContainText("bilinmiyor");
    await expect(page.locator(".search-recovery-changes li")).toHaveCount(2);
    await page.getByRole("button", { name: "Aramayı takip et" }).click();
    await page.reload();
    await page.getByRole("button", { name: /aramana devam et/i }).click();
    await expect(page.getByRole("button", { name: "Boya durumu filtresini kaldır" })).toContainText("Boyasız");
    await expect(page.getByRole("button", { name: "Değişen parça filtresini kaldır" })).toContainText("Değişensiz");
    await expect(page.getByRole("button", { name: "Takipte" })).toBeVisible();
    await page.getByRole("button", { name: /Değişiklikleri uygula/ }).click();
    await expect(page.locator(".market-listing")).toBeVisible();
  });
}

test("older saved searches keep their filters", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.evaluate(() => localStorage.setItem("sattim-gitti-marketplace-v1", JSON.stringify({ lastSearch: { query: "Jeep", filters: { budget: "any", location: "istanbul", transmission: "any", body: "any" } }, followed: [] })));
  await page.reload();
  await page.getByRole("button", { name: /aramana devam et/i }).click();
  await expect(page.locator(".market-listing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Konum filtresini kaldır" })).toContainText("İstanbul");
});
