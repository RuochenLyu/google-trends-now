import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFetchOptions } from "../src/options.js";

test("applies defaults", () => {
  const options = normalizeFetchOptions({});
  assert.equal(options.geo, "US");
  assert.equal(options.hours, 48);
  assert.equal(options.category, "all");
  assert.equal(options.limit, 100);
  assert.equal(options.fallback, "rss");
  assert.equal(options.timeoutMs, 30000);
});

test("uppercases geo so the SDK matches CLI behavior", () => {
  assert.equal(normalizeFetchOptions({ geo: "gb" }).geo, "GB");
});

test("resolves the timeout_ms and fetch aliases", () => {
  const fetchImpl = () => {};
  const options = normalizeFetchOptions({ timeout_ms: 1234, fetch: fetchImpl });
  assert.equal(options.timeoutMs, 1234);
  assert.equal(options.fetchImpl, fetchImpl);
});

test("validates enumerated options when validate is true", () => {
  assert.throws(() => normalizeFetchOptions({ hours: 5 }), /--hours/u);
  assert.throws(() => normalizeFetchOptions({ status: "nope" }), /--status/u);
  assert.throws(() => normalizeFetchOptions({ sort: "nope" }), /--sort/u);
  assert.throws(() => normalizeFetchOptions({ fallback: "maybe" }), /--fallback/u);
  assert.throws(() => normalizeFetchOptions({ limit: "abc" }), /--limit/u);
  assert.throws(() => normalizeFetchOptions({ category: "not-real" }), /Unknown category/u);
});

test("validate:false coerces a bad limit to the default instead of throwing", () => {
  assert.equal(normalizeFetchOptions({ limit: "abc" }, { validate: false }).limit, 100);
  assert.equal(normalizeFetchOptions({ limit: -3 }, { validate: false }).limit, 100);
});

test('limit "all" normalizes to Infinity and passes validation', () => {
  assert.equal(normalizeFetchOptions({ limit: "all" }).limit, Infinity);
  assert.equal(normalizeFetchOptions({ limit: "ALL" }).limit, Infinity);
  // Other strings still fail fast.
  assert.throws(() => normalizeFetchOptions({ limit: "everything" }), /--limit/u);
});

test("includeRaw defaults to false and only accepts a real boolean opt-in", () => {
  assert.equal(normalizeFetchOptions({}).includeRaw, false);
  assert.equal(normalizeFetchOptions({ includeRaw: true }).includeRaw, true);
  assert.equal(normalizeFetchOptions({ include_raw: true }).includeRaw, true);
  assert.equal(normalizeFetchOptions({ includeRaw: "yes" }).includeRaw, false);
});
