import assert from "node:assert/strict";
import test from "node:test";

import { fetchText } from "../src/http.js";

test("returns the body on a 2xx response", async () => {
  const text = await fetchText("https://example.test/ok", {
    fetchImpl: async () => ({ ok: true, status: 200, async text() { return "hello"; } })
  });
  assert.equal(text, "hello");
});

test("throws with status, url, collapsed whitespace, and 240-char snippet on non-2xx", async () => {
  const body = `  a\n\n  b  ${"x".repeat(400)}`;
  await assert.rejects(
    () => fetchText("https://example.test/bad", {
      fetchImpl: async () => ({ ok: false, status: 503, async text() { return body; } })
    }),
    (error) => {
      const prefix = "HTTP 503 for https://example.test/bad: ";
      assert.ok(error.message.startsWith(prefix), error.message);
      const snippet = error.message.slice(prefix.length);
      assert.equal(snippet.length, 240);
      assert.ok(!/ {2,}/u.test(snippet), "whitespace should be collapsed");
      return true;
    }
  );
});

test("sends a default user-agent and merges caller headers", async () => {
  let sentHeaders;
  await fetchText("https://example.test", {
    fetchImpl: async (_url, opts) => {
      sentHeaders = opts.headers;
      return { ok: true, status: 200, async text() { return ""; } };
    },
    headers: { accept: "application/json" }
  });
  assert.match(sentHeaders["user-agent"], /Mozilla/u);
  assert.equal(sentHeaders.accept, "application/json");
});

test("throws a TypeError when no fetch implementation is available", async () => {
  await assert.rejects(
    () => fetchText("https://example.test", { fetchImpl: null }),
    /fetch is not available/u
  );
});
