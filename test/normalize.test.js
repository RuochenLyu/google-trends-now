import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTrendingRow } from "../src/normalize.js";

test("marks an ended row inactive with a populated ended_at", () => {
  const row = ["finals", null, "US", [1710000000], [1710002000], null, 100000, null, 50, ["finals"], [17], [], "finals"];
  const item = normalizeTrendingRow(row, { position: 3, geo: "US", hours: 48 });
  assert.equal(item.active, false);
  assert.equal(item.end_timestamp, 1710002000);
  assert.equal(item.ended_at, new Date(1710002000 * 1000).toISOString());
  assert.equal(item.position, 3);
});

test("marks a row with no end timestamp active with a null ended_at", () => {
  const row = ["live", null, "US", [1710000000], null, null, 1, null, 1, [], [], [], "live"];
  const item = normalizeTrendingRow(row, { position: 1 });
  assert.equal(item.active, true);
  assert.equal(item.ended_at, null);
});

test("falls back to safe defaults for empty and undefined rows", () => {
  const empty = normalizeTrendingRow([], {});
  assert.equal(empty.query, "");
  assert.equal(empty.normalized_query, "");
  assert.deepEqual(empty.categories, []);
  assert.deepEqual(empty.trend_breakdown, []);
  assert.equal(empty.active, true);
  assert.equal(empty.position, 1);

  const undef = normalizeTrendingRow(undefined, {});
  assert.equal(undef.query, "");
  assert.deepEqual(undef.categories, []);
});

test("normalizes numeric, numeric-string, and object-form categories", () => {
  const row = ["q", null, "US", [1], null, null, 1, null, 1, [], [{ id: "18" }, { name: "Custom" }, 15, "17"], [], "q"];
  const item = normalizeTrendingRow(row, {});
  assert.deepEqual(item.categories, [
    { id: 18, name: "Technology" },
    { id: null, name: "Custom" },
    { id: 15, name: "Science" },
    { id: 17, name: "Sports" }
  ]);
});

test("normalizes news_refs triples from row index 11", async () => {
  const { normalizeTrendingRow } = await import("../src/normalize.js");
  const row = [];
  row[0] = "solar eclipse";
  row[11] = [[4704319673, "en", "US"], ["bad"], [4704184441, "es", "US"]];
  const item = normalizeTrendingRow(row, { position: 1, geo: "US", hours: 48 });
  assert.deepEqual(item.news_refs, [
    { id: 4704319673, lang: "en", geo: "US" },
    { id: 4704184441, lang: "es", geo: "US" }
  ]);
});

test("news_refs defaults to an empty array", async () => {
  const { normalizeTrendingRow } = await import("../src/normalize.js");
  const item = normalizeTrendingRow(["q"], { position: 1 });
  assert.deepEqual(item.news_refs, []);
});
