import assert from "node:assert/strict";
import test from "node:test";
import { estimateUsageCost, exampleVehicle, matchesNeed } from "../src/decision-data.ts";

test("family searches require seats and luggage together, not SUV body style", () => {
  assert.equal(matchesNeed({ ...exampleVehicle, seats: 5, luggage: 400 }, "family"), true);
  assert.equal(matchesNeed({ ...exampleVehicle, seats: 4, luggage: 600 }, "family"), false);
  assert.equal(matchesNeed({ ...exampleVehicle, seats: 7, luggage: 399 }, "family"), false);
});
test("large-luggage and economy thresholds include their exact boundary", () => {
  assert.equal(matchesNeed({ ...exampleVehicle, luggage: 499 }, "luggage"), false);
  assert.equal(matchesNeed({ ...exampleVehicle, luggage: 500 }, "luggage"), true);
  assert.equal(matchesNeed({ ...exampleVehicle, consumption: 8 }, "economy"), true);
  assert.equal(matchesNeed({ ...exampleVehicle, consumption: 8.1 }, "economy"), false);
});
test("usage estimate separates fuel from the monthly maintenance allowance", () => {
  assert.deepEqual(estimateUsageCost(exampleVehicle, 1200, 48, 900), { fuel: 4320, maintenance: 900, total: 5220 });
  assert.deepEqual(estimateUsageCost(exampleVehicle, 0, 48, 900), { fuel: 0, maintenance: 900, total: 900 });
});
test("missing or invalid usage data cannot produce a cost or economy match", () => {
  for (const invalid of [NaN, Infinity, -1]) {
    assert.equal(estimateUsageCost(exampleVehicle, invalid, 50), null);
    assert.equal(estimateUsageCost(exampleVehicle, 1000, invalid), null);
    assert.equal(estimateUsageCost(exampleVehicle, 1000, 50, invalid), null);
    assert.equal(matchesNeed({ ...exampleVehicle, consumption: invalid }, "economy"), false);
  }
  assert.equal(estimateUsageCost(exampleVehicle, Number.MAX_VALUE, Number.MAX_VALUE), null);
  assert.equal(matchesNeed({ ...exampleVehicle, luggage: NaN }, "family"), false);
  assert.equal(matchesNeed({ ...exampleVehicle, luggage: NaN }, "luggage"), false);
  assert.equal(matchesNeed({ ...exampleVehicle, luggage: Infinity }, "luggage"), false);
  assert.equal(matchesNeed({ ...exampleVehicle, seats: Infinity }, "family"), false);
});
