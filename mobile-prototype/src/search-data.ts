import { demoListing } from "./listing-data";
import { exampleVehicle, matchesNeed, money, type NeedId } from "./decision-data";

export type Filters = { budget: string; location: string; transmission: string; body: string; paint: string; replacement: string };
export type Search = { query: string; filters: Filters; need?: NeedId };
export const defaults: Filters = { budget: "any", location: "any", transmission: "any", body: "any", paint: "any", replacement: "any" };
export const filterGroups = [
  { key: "budget", label: "Bütçe", options: [["any", "Fark etmez"], ["1000000", "1 milyon ₺'ye kadar"], ["1500000", "1,5 milyon ₺'ye kadar"], ["2000000", "2 milyon ₺'ye kadar"]] },
  { key: "location", label: "Konum", options: [["any", "Tüm Türkiye"], ["istanbul", "İstanbul"], ["ankara", "Ankara"]] },
  { key: "transmission", label: "Vites", options: [["any", "Fark etmez"], ["auto", "Otomatik"], ["manual", "Manuel"]] },
  { key: "body", label: "Kasa tipi", options: [["any", "Fark etmez"], ["suv", "SUV"], ["sedan", "Sedan"]] },
  { key: "paint", label: "Boya durumu", options: [["any", "Fark etmez"], ["none", "Boyasız"]] },
  { key: "replacement", label: "Değişen parça", options: [["any", "Fark etmez"], ["none", "Değişensiz"]] },
] as const;

// Unknown history is not evidence that a vehicle has no paint or replaced parts.
export function matchesCondition(filters: Filters, condition: { paint: "none" | "present" | "unknown"; replacement: "none" | "present" | "unknown" }) {
  return (filters.paint === "any" || condition.paint === "none")
    && (filters.replacement === "any" || condition.replacement === "none");
}

export function matchesListing(search: Search) {
  const text = `${demoListing.name} ${demoListing.version} ${demoListing.year} ${demoListing.fuel} ${demoListing.transmission} ${demoListing.location} SUV`.toLocaleLowerCase("tr");
  const { budget, location, transmission, body } = search.filters;
  return matchesCondition(search.filters, { paint: "unknown", replacement: "unknown" }) && matchesNeed(exampleVehicle, search.need) && search.query.trim().toLocaleLowerCase("tr").split(/\s+/).every((word) => text.includes(word))
    && (budget === "any" || Number(demoListing.price.replaceAll(".", "")) <= Number(budget))
    && (location === "any" || location === "istanbul") && transmission !== "manual" && body !== "sedan";
}

// A preview of the fictional listing, never evidence of a newly published vehicle.
export function matchNotification(search: Search) {
  if (!matchesListing(search)) return null;
  const budget = search.filters.budget === "any" ? null : Number(search.filters.budget);
  const difference = budget === null ? null : budget - Number(demoListing.price.replaceAll(".", ""));
  const budgetCopy = difference === null ? "" : difference > 0 ? ` Bütçenden ${money(difference)} daha uygun.` : " Tam bütçe sınırında.";
  return {
    title: `Aradığın özelliklerde bir ${demoListing.name} var!`,
    details: `${demoListing.year} model, ${demoListing.transmission.toLocaleLowerCase("tr")}, ${demoListing.mileage} km.${budgetCopy}`,
    reason: "Seçtiğin tüm arama kriterlerini karşılıyor.",
  };
}
