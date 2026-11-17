import { expect, test } from "@playwright/test";
import { defaults, matchNotification, type Search } from "../src/search-data";

const search: Search = { query: "Jeep", filters: { ...defaults, budget: "2000000", transmission: "auto" }, need: "family" };

test("notification explains the actual example vehicle and saved budget", () => {
  const message = matchNotification(search)!;
  expect(message.title).toContain("Jeep Compass");
  expect(message.details).toContain("2021 model, otomatik, 68.400 km");
  expect(message.details).toContain("Bütçenden 315.000 ₺ daha uygun");
  expect(message.reason).toContain("tüm arama kriterlerini");
});

test("no notification for any failed required search criterion", () => {
  for (const filters of [
    { budget: "1500000" }, { transmission: "manual" }, { location: "ankara" }, { body: "sedan" },
  ]) expect(matchNotification({ ...search, filters: { ...search.filters, ...filters } })).toBeNull();
  expect(matchNotification({ ...search, query: "Clio" })).toBeNull();
  expect(matchNotification({ ...search, need: "luggage" })).toBeNull();
});

test("unlimited or exact budgets never invent savings", () => {
  expect(matchNotification({ ...search, filters: defaults })!.details).not.toContain("Bütçenden");
  const exact = matchNotification({ ...search, filters: { ...defaults, budget: "1685000" } })!;
  expect(exact.details).toContain("Tam bütçe sınırında");
  expect(exact.details).not.toContain("daha uygun");
});

test("Turkish query normalization is shared with result matching", () => {
  expect(matchNotification({ ...search, query: "JEEP İSTANBUL" })).not.toBeNull();
});
