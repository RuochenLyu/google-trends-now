import assert from "node:assert/strict";
import test from "node:test";

import { categories, categoryId, categoryName, categoryRows } from "../src/categories.js";

test("resolves an alias to its numeric id", () => {
  assert.equal(categoryId("technology"), 18);
  assert.equal(categoryId("all"), 0);
});

test("is case- and whitespace-insensitive on aliases", () => {
  assert.equal(categoryId("  Technology  "), 18);
});

test("passes a numeric id (string or number) straight through for forward compat", () => {
  assert.equal(categoryId(18), 18);
  assert.equal(categoryId("18"), 18);
  // An unknown numeric id is still accepted so a newly-added upstream category
  // does not have to ship a client release first.
  assert.equal(categoryId("99"), 99);
});

test("fails fast on an unknown non-numeric category", () => {
  assert.throws(() => categoryId("not-a-category"), /Unknown category: not-a-category/u);
});

test("defaults to all when the value is omitted", () => {
  assert.equal(categoryId(), 0);
});

test("categoryName maps known ids and echoes unknown ones", () => {
  assert.equal(categoryName(18), "Technology");
  // Google's category ids are alphabetical: id 1 sits between All and Beauty
  // and Fashion. A missing row here leaks bare "1" names downstream.
  assert.equal(categoryName(1), "Autos and Vehicles");
  assert.equal(categoryId("autos_and_vehicles"), 1);
  assert.equal(categoryId("beauty_and_fashion"), 2);
  assert.equal(categoryName(999), "999");
});

test("categoryRows exposes alias/id/name for every alias", () => {
  const rows = categoryRows();
  assert.equal(rows.length, Object.keys(categories).length);
  assert.deepEqual(
    rows.find((row) => row.alias === "technology"),
    { alias: "technology", id: 18, name: "Technology" }
  );
});
