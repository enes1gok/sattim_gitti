import { expect, test } from "@playwright/test";
import { emptyJourney, journeyProgress, journeySteps, normalizeChecks, parseJourneyState, toggleJourneyCheck, validAppointment } from "../src/sales-journey";

test.use({ channel: "chrome" });

test("notary and handover confirmations require preparation and reopen when a prerequisite changes", () => {
  expect(toggleJourneyCheck(emptyJourney(), "notary").completed).toEqual([]);
  const all = journeySteps.flatMap((step) => step.checks.map((check) => check.id));
  const complete = { ...emptyJourney(), completed: all };
  expect(journeyProgress(complete).done).toBe(9);
  const reopened = toggleJourneyCheck(complete, "policy");
  expect(reopened.completed).not.toContain("notary");
  expect(reopened.completed).not.toContain("handover");
  expect(reopened.completed).not.toContain("aftercare");
  expect(reopened.completed).toContain("payment");
  expect(normalizeChecks(["unknown", "notary", "handover", "aftercare"])).toEqual([]);
});

test("stored process data is bounded and buyer/seller progress stays independent", () => {
  const state = parseJourneyState({ role: "seller", buyer: { completed: ["contact", "notary"], message: "a".repeat(1600), offer: "garbage" }, seller: { completed: ["appointment"] } });
  expect(state.role).toBe("seller");
  expect(state.buyer.completed).toEqual(["contact"]);
  expect(state.seller.completed).toEqual(["appointment"]);
  expect(state.buyer.message).toHaveLength(1200);
  expect(state.buyer.offer).toBe("");
  expect(parseJourneyState(null).buyer).toEqual(emptyJourney());
  expect(validAppointment("31.02.2027", "14:30", "Merkez")).toBe(false);
  expect(validAppointment("29.02.2028", "14:30", "Merkez")).toBe(true);
  expect(validAppointment("30.10.2026", "25:00", "Merkez")).toBe(false);
  expect(validAppointment("30.10.2026", "14:30", " ")).toBe(false);
});

for (const device of ["iphone", "pixel-10"] as const) {
  test(`${device}: draft, appointment and role progress persist with the keyboard clear of controls`, async ({ page }) => {
    await page.goto("/?demo=1");
    if (device === "pixel-10") {
      await page.getByTestId("device-picker").click();
      await page.getByTestId("device-option-pixel-10").click();
    }
    await page.getByRole("button", { name: "Kaydedilenler", exact: true }).click();
    await page.getByRole("button", { name: "Aramalar", exact: true }).click();
    await page.getByRole("button", { name: /^Alım-satım sürecin/ }).click();
    await page.getByRole("button", { name: "Bu adıma geç" }).click();
    await page.getByRole("textbox", { name: "Mesaj taslağı", exact: true }).fill("Merhaba, bakım kayıtlarını inceleyebilir miyim?");
    await page.getByRole("button", { name: "Mesaj taslağını kaydet", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Karşı tarafa gönderilmedi");
    await expect(page.getByTestId("keyboard-dock")).toHaveAttribute("data-visible", "false");
    await page.getByRole("checkbox", { name: "Satıcıyla görüştüm, sorularımı sordum" }).check();
    await page.getByRole("button", { name: /^2\. Randevu/ }).click();
    await page.getByRole("textbox", { name: "Randevu tarihi" }).fill("31.02.2027");
    await page.getByRole("textbox", { name: "Randevu saati" }).fill("14:30");
    await page.getByRole("textbox", { name: "Buluşma yeri" }).fill("Örnek ekspertiz merkezi");
    await page.getByRole("button", { name: "Randevu planını kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("Geçerli bir tarih");
    await page.getByRole("textbox", { name: "Randevu tarihi" }).fill("30.10.2027");
    await page.getByRole("button", { name: "Randevu planını kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("davet veya bildirim gönderilmedi");
    await page.getByRole("button", { name: "Araç satıyorum", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
    await page.getByRole("button", { name: "Araç alıyorum", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
    await page.reload();
    await page.getByRole("button", { name: "Kaydedilenler", exact: true }).click();
    await page.getByRole("button", { name: "Aramalar", exact: true }).click();
    await page.getByRole("button", { name: /^Alım-satım sürecin/ }).click();
    await expect(page.getByRole("textbox", { name: "Randevu tarihi" })).toHaveValue("30.10.2027");
    await page.getByRole("button", { name: /^1\. Mesajlaşma/ }).click();
    await expect(page.getByRole("textbox", { name: "Mesaj taslağı", exact: true })).toHaveValue("Merhaba, bakım kayıtlarını inceleyebilir miyim?");
    await page.getByRole("button", { name: /^8\. Noter/ }).click();
    await expect(page.getByRole("checkbox", { name: "Resmî noter devrinin tamamlandığını teyit ettim" })).toBeDisabled();
    await page.getByRole("button", { name: /^6\. MTV/ }).click();
    await expect(page.getByRole("link", { name: "GİB'de MTV sorgula / öde" })).toHaveAttribute("href", "https://dijital.gib.gov.tr/");
  });
}

test("changing an offer reopens payment, notary and handover confirmations", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Kaydedilenler", exact: true }).click();
    await page.getByRole("button", { name: "Aramalar", exact: true }).click();
  await page.getByRole("button", { name: /^Alım-satım sürecin/ }).click();
  for (const [step, checks] of [
    ["5. Trafik sigortası", ["Adıma düzenlenen poliçenin satış tarihinde geçerli olduğunu kontrol ettim"]],
    ["6. MTV", ["Satışa engel borçların kontrolünü satıcıyla teyit ettim"]],
    ["7. Güvenli ödeme", ["Araç, taraflar ve satış tutarını resmî kanalda kontrol ettim", "Yetkili kuruluşta ödemenin noter işlemine hazır olduğunu teyit ettim"]],
    ["8. Noter", ["Kimlik, ruhsat, araç bilgileri ve devir koşullarını kontrol ettim", "Resmî noter devrinin tamamlandığını teyit ettim"]],
    ["9. Teslim", ["Aracı, anahtarları ve belgeleri teslim aldım", "HGS, bakım ve MTV takibimi planladım"]],
  ] as const) {
    await page.getByRole("button", { name: new RegExp(`^${step.replace(".", "\\.")}`) }).click();
    for (const name of checks) await page.getByRole("checkbox", { name, exact: true }).check();
  }
  await page.getByRole("button", { name: /^4\. Fiyat teklifi/ }).click();
  await page.getByRole("textbox", { name: "Teklif tutarı", exact: true }).fill("1650000");
  await page.getByRole("button", { name: "Teklif taslağını kaydet" }).click();
  await expect(page.getByRole("status")).toContainText("Gönderilmedi veya kabul edilmedi");
  await page.getByRole("button", { name: /^8\. Noter/ }).click();
  const notary = page.getByRole("checkbox", { name: "Resmî noter devrinin tamamlandığını teyit ettim" });
  await expect(notary).not.toBeChecked();
  await expect(notary).toBeDisabled();
  await page.getByRole("button", { name: /^9\. Teslim/ }).click();
  await expect(page.getByRole("checkbox", { name: "Aracı, anahtarları ve belgeleri teslim aldım" })).not.toBeChecked();
});
