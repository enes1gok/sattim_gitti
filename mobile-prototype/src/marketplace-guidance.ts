import type { CloudSearch, Listing } from "./marketplace-api";
import { money } from "./decision-data";
import { defaults, filterGroups, type Filters } from "./search-data";

export const onboardingKey = "sattim-gitti-onboarding-v1";
export type Onboarding = { completed: boolean; step: 0 | 1 | 2; intent: "buy" | "sell" | "browse" | null; filters: Filters; appliedFilters: Filters | null };
export const newOnboarding = (): Onboarding => ({ completed: false, step: 0, intent: null, filters: { ...defaults }, appliedFilters: null });

export function readOnboarding(): Onboarding {
  try {
    const value = JSON.parse(localStorage.getItem(onboardingKey) ?? "null");
    if (!value || ![0, 1, 2].includes(value.step) || ![null, "buy", "sell", "browse"].includes(value.intent)
      || !filterGroups.every((group) => group.options.some(([option]) => option === value.filters?.[group.key]))) return newOnboarding();
    const appliedFilters = value.appliedFilters && filterGroups.every((group) => group.options.some(([option]) => option === value.appliedFilters[group.key])) ? { ...value.appliedFilters } : null;
    return { completed: value.completed === true, step: value.step, intent: value.intent, filters: { ...value.filters }, appliedFilters };
  } catch { return newOnboarding(); }
}

// Explain actual fields; a saved preference alone is never evidence of a match.
export function explainMatch(listing: Listing, search: CloudSearch) {
  const matched: string[] = [], missing: string[] = [];
  const f = search.filters;
  if (f.budget !== "any") {
    const gap = Number(f.budget) - listing.price;
    (gap >= 0 ? matched : missing).push(gap > 0 ? `Bütçenin ${money(gap)} altında` : gap === 0 ? "Tam bütçe sınırında" : `Bütçenin ${money(-gap)} üzerinde`);
  }
  for (const [key, actual, expected] of [
    ["location", listing.city, f.location === "istanbul" ? "İstanbul" : "Ankara"],
    ["transmission", listing.transmission, f.transmission === "auto" ? "Otomatik" : "Manuel"],
    ["body", listing.body, f.body === "suv" ? "SUV" : "Sedan"],
  ] as const) {
    if (f[key] !== "any") (actual === expected ? matched : missing).push(actual === expected ? expected : `${expected} tercihinle eşleşmiyor (${actual || "belirtilmedi"})`);
  }
  for (const [key, label] of [["paint", "Boyasız"], ["replacement", "Değişensiz"]] as const) {
    if (f[key] === "none") (listing[key] === "none" ? matched : missing).push(listing[key] === "none" ? `${label} · satıcı beyanı` : `${label} tercihi: ${listing[key] === "present" ? "eşleşmiyor" : "bilgi bilinmiyor"}`);
  }
  return { matched, missing };
}
