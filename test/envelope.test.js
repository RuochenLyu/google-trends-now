import assert from "node:assert/strict";
import test from "node:test";

import { buildEnvelope } from "../src/envelope.js";

const baseArgs = {
  observedAt: "2026-07-06T00:00:00.000Z",
  options: { geo: "US", hours: 48, category: "all", status: "all", sort: "relevance" },
  source: "google_trending_now",
  fetchStatus: "success",
  sourceUrl: "https://trends.google.com/trending?geo=US"
};

test("builds the default envelope field set in order", () => {
  const env = buildEnvelope({ ...baseArgs });
  assert.deepEqual(Object.keys(env), [
    "observed_at", "geo", "hours", "category", "status", "sort",
    "source", "fetch_status", "source_url", "error", "items"
  ]);
  assert.equal(env.error, null);
  assert.deepEqual(env.items, []);
});

test("maps option, status, and content fields onto the envelope", () => {
  const env = buildEnvelope({ ...baseArgs, error: "boom", items: [{ position: 1 }] });
  assert.equal(env.geo, "US");
  assert.equal(env.hours, 48);
  assert.equal(env.source, "google_trending_now");
  assert.equal(env.fetch_status, "success");
  assert.equal(env.source_url, baseArgs.sourceUrl);
  assert.equal(env.error, "boom");
  assert.equal(env.items.length, 1);
});

test("spreads extra keys after the base set without disturbing it", () => {
  const env = buildEnvelope({
    ...baseArgs,
    extra: { raw: [1, 2], category_filter_status: "unavailable_in_rss" }
  });
  assert.deepEqual(Object.keys(env).slice(0, 11), [
    "observed_at", "geo", "hours", "category", "status", "sort",
    "source", "fetch_status", "source_url", "error", "items"
  ]);
  assert.deepEqual(env.raw, [1, 2]);
  assert.equal(env.category_filter_status, "unavailable_in_rss");
});
