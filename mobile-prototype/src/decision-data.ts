// Fictional evaluation inputs, not verified specifications or current market prices.
export type NeedId = "family" | "luggage" | "economy";
export type DecisionTab = "compare" | "price" | "cost";
export type DecisionVehicle = { name: string; price: number; seats: number; luggage: number; consumption: number; monthlyMaintenance: number; transmission: string };
export const exampleVehicle: DecisionVehicle = { name: "Jeep Compass", price: 1685000, seats: 5, luggage: 440, consumption: 7.5, monthlyMaintenance: 1000, transmission: "Otomatik" };
export const comparisonVehicle: DecisionVehicle = { name: "Örnek station wagon", price: 1550000, seats: 5, luggage: 580, consumption: 5.8, monthlyMaintenance: 1000, transmission: "Otomatik" };
export const usageAssumptions = { monthlyKm: 1000, fuelPrice: 50, monthlyLimit: 5000 };
export const needs: { id: NeedId; label: string; shortLabel: string; criteria: string }[] = [
  { id: "family", label: "Aile arabası", shortLabel: "Aile arabası", criteria: "En az 5 koltuk ve 400 L bagaj" },
  { id: "luggage", label: "Büyük bagaj", shortLabel: "Büyük bagaj", criteria: "En az 500 L bagaj" },
  { id: "economy", label: "Düşük kullanım maliyeti", shortLabel: "Düşük maliyet", criteria: "Örnek yakıt + bakım bütçesi ayda en fazla 5.000 ₺" },
];
export function estimateUsageCost(vehicle: DecisionVehicle, monthlyKm: number, fuelPrice: number, monthlyMaintenance = vehicle.monthlyMaintenance) {
  if (![monthlyKm, fuelPrice, monthlyMaintenance, vehicle.consumption].every((value) => Number.isFinite(value) && value >= 0)) return null;
  const fuel = monthlyKm / 100 * vehicle.consumption * fuelPrice;
  if (!Number.isFinite(fuel + monthlyMaintenance)) return null;
  return { fuel, maintenance: monthlyMaintenance, total: fuel + monthlyMaintenance };
}
export function matchesNeed(vehicle: DecisionVehicle, need?: NeedId) {
  if (!need) return true;
  if (need === "family") return Number.isFinite(vehicle.seats) && Number.isFinite(vehicle.luggage) && vehicle.seats >= 5 && vehicle.luggage >= 400;
  if (need === "luggage") return Number.isFinite(vehicle.luggage) && vehicle.luggage >= 500;
  const cost = estimateUsageCost(vehicle, usageAssumptions.monthlyKm, usageAssumptions.fuelPrice);
  return cost !== null && cost.total <= usageAssumptions.monthlyLimit;
}
export function needDefinition(need?: NeedId) { return needs.find(({ id }) => id === need); }
export function money(value: number) { return `${Math.round(value).toLocaleString("tr-TR")} ₺`; }
