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

test("fetchTrendingNews resolves refs into articles via w4opAf", async () => {
  const { fetchTrendingNews } = await import("../src/client.js");
  const articles = [[
    "Sample headline", "https://example.com/a", "Example News", [1783136810],
    "https://example.com/thumb.jpg"
  ]];
  const inner = JSON.stringify([articles]);
  const body = `)]}'\n\n[["wrb.fr","w4opAf",${JSON.stringify(inner)},null,null,null,"generic"]]`;
  let requestedUrl = "";
  const result = await fetchTrendingNews(
    [{ id: 4704319673, lang: "en", geo: "US" }],
    { fetchImpl: async (url) => { requestedUrl = String(url); return response(body); } }
  );
  assert.ok(requestedUrl.includes("rpcids=w4opAf"));
  assert.deepEqual(result, [{
    title: "Sample headline",
    url: "https://example.com/a",
    source: "Example News",
    published_at: new Date(1783136810 * 1000).toISOString(),
    publish_timestamp: 1783136810,
    thumbnail_url: "https://example.com/thumb.jpg"
  }]);
});

test("fetchTrendingNews returns [] for empty refs without fetching", async () => {
  const { fetchTrendingNews } = await import("../src/client.js");
  assert.deepEqual(await fetchTrendingNews([], { fetchImpl: async () => { throw new Error("no"); } }), []);
});
