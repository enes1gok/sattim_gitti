import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { buildCatalogSql, validateCatalog } from "../scripts/prepare-vehicle-catalog.mjs";

const root = new URL("../data/vehiclesdb/", import.meta.url);
const raw = await readFile(new URL("catalog.json", root));
const catalog = JSON.parse(raw);
const snapshot = JSON.parse(await readFile(new URL("snapshot.json", root), "utf8"));
const supplement = JSON.parse(await readFile(new URL("turkey-supplement.json", root), "utf8"));
const source = { id: "vehiclesdb", version: catalog.version, name: "VehiclesDB" };

test("pinned snapshot has its recorded hash and no orphan/duplicate identities", () => {
  assert.equal(createHash("sha256").update(raw).digest("hex"), snapshot.catalog_sha256);
  assert.doesNotThrow(() => validateCatalog(catalog));
  for (const [make, model] of [["jeep", "Compass"], ["toyota", "Corolla"], ["renault", "Clio"], ["togg", "T10X"]]) {
    assert.ok(catalog.models.some((row) => row.make_slug === make && row.name.toLowerCase() === model.toLowerCase()), `${make} ${model}`);
  }
});

test("invalid references, duplicate natural identities and unknown snapshots fail closed", () => {
  const orphan = structuredClone(catalog);
  orphan.models[0].make_slug = "nonexistent";
  assert.throws(() => validateCatalog(orphan), /orphaned/);
  const duplicate = structuredClone(catalog);
  duplicate.models[1] = { ...duplicate.models[0], source_key: "different-id" };
  assert.throws(() => validateCatalog(duplicate), /duplicate/);
  assert.throws(() => validateCatalog({ ...catalog, version: "unknown" }), /Unexpected/);
});

test("seed quotes names as data and is deterministic", () => {
  const altered = structuredClone(catalog);
  altered.models[0].name = "O'Brand; DROP TABLE vehicle_models; --";
  const sql = buildCatalogSql(altered, source, supplement);
  assert.ok(sql.includes("O''Brand; DROP TABLE vehicle_models; --"));
  assert.equal(sql, buildCatalogSql(altered, source, supplement));
  assert.match(sql, /begin;/);
  assert.match(sql, /commit;/);
  assert.doesNotMatch(sql, /insert into public.vehicle_model_years|insert into public.vehicle_variants/i);
});

test("Turkish supplement uses manufacturer evidence and preserves native names", () => {
  assert.equal(supplement.source.url, "https://www.tofas.com.tr/Hakkimizda/Tarihce");
  assert.deepEqual(supplement.models.map((row) => row.name), ["Murat 131", "Şahin", "Kartal", "Doğan"]);
  assert.ok(supplement.models.every((row) => row.source_id === supplement.source.id && row.observed_countries.includes("tr")));
});
