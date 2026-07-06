import assert from "node:assert/strict";
import test from "node:test";

import { applyFiltersAndSort } from "../src/filter.js";

const items = [
  {
    position: 1,
    raw_position: 1,
    query: "basketball finals",
    search_volume: 100000,
    start_timestamp: 1710001200,
    active: false,
    categories: [{ id: 17, name: "Sports" }]
  },
  {
    position: 2,
    raw_position: 2,
    query: "mars eclipse",
    search_volume: 50000,
    start_timestamp: 1710000000,
    active: true,
    categories: [{ id: 18, name: "Technology" }, { id: 15, name: "Science" }]
  }
];

test("filters categories locally against returned row categories", () => {
  const filtered = applyFiltersAndSort(items, { category: "technology", status: "all", sort: "relevance" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].query, "mars eclipse");
  assert.equal(filtered[0].position, 1);
  assert.equal(filtered[0].raw_position, 2);
});

test("filters active status and sorts by volume", () => {
  const filtered = applyFiltersAndSort(items, { category: "all", status: "ended", sort: "volume" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].query, "basketball finals");
});

test("a non-numeric limit falls back to the default instead of returning zero items", () => {
  const filtered = applyFiltersAndSort(items, { limit: "abc" });
  assert.equal(filtered.length, 2);
});

test("sorts by title alphabetically", () => {
  const filtered = applyFiltersAndSort(items, { sort: "title" });
  assert.deepEqual(filtered.map((item) => item.query), ["basketball finals", "mars eclipse"]);
});
