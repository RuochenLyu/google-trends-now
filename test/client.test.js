import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { fetchTrendingNow } from "../src/client.js";

function response(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return text;
    }
  };
}

async function fixtureFetch() {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  return response(fixture);
}

// Regression anchor: without new options the envelope must keep exactly the
// pre-includeRaw key set — no `raw` key may appear by default.
test("default envelope key set is unchanged (no raw key)", async () => {
  const output = await fetchTrendingNow({ geo: "US", hours: 48, fetchImpl: fixtureFetch });
  assert.deepEqual(Object.keys(output), [
    "observed_at", "geo", "hours", "category", "status", "sort",
    "source", "fetch_status", "source_url", "error", "items"
  ]);
  assert.equal(output.fetch_status, "success");
});

test("includeRaw attaches the pre-normalization payload on the google path", async () => {
  const output = await fetchTrendingNow({ geo: "US", hours: 48, includeRaw: true, fetchImpl: fixtureFetch });
  assert.ok("raw" in output);
  assert.ok(Array.isArray(output.raw));
  // The raw payload carries the row list the items were normalized from.
  assert.ok(JSON.stringify(output.raw).includes("mars eclipse"));
});

test("includeRaw carries raw: null on the failure path for shape consistency", async () => {
  const output = await fetchTrendingNow({
    geo: "US",
    hours: 48,
    includeRaw: true,
    fallback: "none",
    fetchImpl: async () => response("nope", 500)
  });
  assert.equal(output.fetch_status, "manual_review_required");
  assert.equal(output.raw, null);
});

test('limit "all" returns the full fixture pool', async () => {
  const limited = await fetchTrendingNow({ geo: "US", hours: 48, limit: 1, fetchImpl: fixtureFetch });
  const all = await fetchTrendingNow({ geo: "US", hours: 48, limit: "all", fetchImpl: fixtureFetch });
  assert.equal(limited.items.length, 1);
  assert.equal(all.items.length, 2);
});
