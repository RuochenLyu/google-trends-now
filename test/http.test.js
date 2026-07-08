import assert from "node:assert/strict";
import test from "node:test";

import { FetchHttpError, fetchText } from "../src/http.js";

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

test("throws a FetchHttpError carrying status, url, and bodySnippet", async () => {
  await assert.rejects(
    () => fetchText("https://example.test/oops", {
      fetchImpl: async () => ({ ok: false, status: 429, async text() { return "too many"; } })
    }),
    (error) => {
      assert.ok(error instanceof FetchHttpError);
      assert.equal(error.name, "FetchHttpError");
      assert.equal(error.status, 429);
      assert.equal(error.url, "https://example.test/oops");
      assert.equal(error.bodySnippet, "too many");
      return true;
    }
  );
});

test("does not retry by default (retries defaults to 0)", async () => {
  let calls = 0;
  await assert.rejects(
    () => fetchText("https://example.test/bad", {
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 503, async text() { return "down"; } };
      }
    }),
    (error) => error instanceof FetchHttpError && error.status === 503
  );
  assert.equal(calls, 1);
});

test("retries a 429 honoring Retry-After, then succeeds", async () => {
  let calls = 0;
  const sleeps = [];
  const text = await fetchText("https://example.test/rl", {
    retries: 2,
    sleep: async (ms) => { sleeps.push(ms); },
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 429,
          headers: { get: (name) => (name.toLowerCase() === "retry-after" ? "0" : null) },
          async text() { return "slow down"; }
        };
      }
      return { ok: true, status: 200, async text() { return "ok"; } };
    }
  });
  assert.equal(text, "ok");
  assert.equal(calls, 2);
  // Retry-After: 0 collapses the wait to zero rather than the linear backoff.
  assert.deepEqual(sleeps, [0]);
});

test("retries a 5xx up to the budget, then throws the FetchHttpError", async () => {
  let calls = 0;
  await assert.rejects(
    () => fetchText("https://example.test/5xx", {
      retries: 2,
      sleep: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 500, async text() { return "boom"; } };
      }
    }),
    (error) => error instanceof FetchHttpError && error.status === 500
  );
  assert.equal(calls, 3);
});

test("does not retry a non-429 4xx even when retries are allowed", async () => {
  let calls = 0;
  await assert.rejects(
    () => fetchText("https://example.test/404", {
      retries: 3,
      sleep: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 404, async text() { return "nope"; } };
      }
    }),
    (error) => error instanceof FetchHttpError && error.status === 404
  );
  assert.equal(calls, 1);
});

test("counts a thrown (network-layer) fetch as retryable", async () => {
  let calls = 0;
  const text = await fetchText("https://example.test/flap", {
    retries: 1,
    sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        throw new TypeError("network down");
      }
      return { ok: true, status: 200, async text() { return "recovered"; } };
    }
  });
  assert.equal(text, "recovered");
  assert.equal(calls, 2);
});
