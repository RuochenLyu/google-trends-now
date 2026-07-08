import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { main } from "../src/cli.js";

function response(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return text;
    }
  };
}

test("CLI trending smoke test with mocked fetch", async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  let stdout = "";
  const code = await main(
    ["trending", "--geo", "US", "--hours", "48", "--category", "technology", "--format", "json"],
    {
      fetchImpl: async () => response(fixture),
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(code, 0);
  const output = JSON.parse(stdout);
  assert.equal(output.fetch_status, "success");
  assert.equal(output.items.length, 1);
  assert.equal(output.items[0].query, "mars eclipse");
});

test("CLI RSS smoke test with mocked fetch", async () => {
  const fixture = await readFile(new URL("./fixtures/rss.xml", import.meta.url), "utf8");
  let stdout = "";
  const code = await main(
    ["rss", "--geo", "US", "--format", "json"],
    {
      fetchImpl: async () => response(fixture),
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(code, 0);
  const output = JSON.parse(stdout);
  assert.equal(output.fetch_status, "rss_limited");
  assert.equal(output.items.length, 2);
});

test("CLI trending RSS fallback does not category-filter RSS to empty", async () => {
  const fixture = await readFile(new URL("./fixtures/rss.xml", import.meta.url), "utf8");
  let stdout = "";
  let callCount = 0;
  const code = await main(
    ["trending", "--geo", "US", "--category", "technology", "--format", "json"],
    {
      fetchImpl: async () => {
        callCount += 1;
        return callCount === 1 ? response("upstream error", 502) : response(fixture);
      },
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(code, 0);
  const output = JSON.parse(stdout);
  assert.equal(output.fetch_status, "rss_limited");
  assert.equal(output.category_filter_status, "unavailable_in_rss");
  assert.equal(output.items.length, 2);
});

test("CLI rejects unknown category without fetching", async () => {
  let stderr = "";
  let called = false;
  const code = await main(["trending", "--category", "not-a-category"], {
    fetchImpl: async () => {
      called = true;
      throw new Error("should not fetch");
    },
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    }
  });

  assert.equal(code, 2);
  assert.equal(called, false);
  assert.match(stderr, /Unknown category: not-a-category/u);
});

test("CLI categories works without network", async () => {
  let stdout = "";
  let called = false;
  const code = await main(["categories"], {
    fetchImpl: async () => {
      called = true;
      throw new Error("should not fetch");
    },
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {}
  });

  assert.equal(code, 0);
  assert.equal(called, false);
  const rows = JSON.parse(stdout);
  assert.equal(rows.find((row) => row.alias === "technology").id, 18);
});

test("CLI categories rejects irrelevant category option", async () => {
  let stderr = "";
  const code = await main(["categories", "--category", "all"], {
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    }
  });

  assert.equal(code, 2);
  assert.match(stderr, /does not accept --category/u);
});

test("CLI --version prints the package version", async () => {
  let stdout = "";
  const code = await main(["--version"], { stdout: (text) => { stdout += text; }, stderr: () => {} });
  assert.equal(code, 0);
  assert.match(stdout, /^\d+\.\d+\.\d+\n$/u);
});

test("CLI --help and no-args print usage", async () => {
  for (const argv of [["--help"], []]) {
    let stdout = "";
    const code = await main(argv, { stdout: (text) => { stdout += text; }, stderr: () => {} });
    assert.equal(code, 0);
    assert.match(stdout, /Usage:/u);
  }
});

test("CLI unknown command exits 2", async () => {
  let stderr = "";
  const code = await main(["bogus"], { stdout: () => {}, stderr: (text) => { stderr += text; } });
  assert.equal(code, 2);
  assert.match(stderr, /Unknown command: bogus/u);
});

test("CLI rejects an unknown/misspelled option instead of silently ignoring it", async () => {
  let stderr = "";
  let fetched = false;
  const code = await main(["trending", "--categroy", "sports"], {
    fetchImpl: async () => { fetched = true; throw new Error("should not fetch"); },
    stdout: () => {},
    stderr: (text) => { stderr += text; }
  });
  assert.equal(code, 2);
  assert.equal(fetched, false);
  assert.match(stderr, /Unknown option: --categroy/u);
});

test("CLI accepts the --key=value form", async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  let stdout = "";
  const code = await main(["trending", "--hours=48", "--format=json"], {
    fetchImpl: async () => response(fixture),
    stdout: (text) => { stdout += text; },
    stderr: () => {}
  });
  assert.equal(code, 0);
  assert.equal(JSON.parse(stdout).hours, 48);
});

test("CLI does not reject an inline value that begins with -- (--geo=--x)", async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  let stderr = "";
  const code = await main(["trending", "--geo=--x"], {
    fetchImpl: async () => response(fixture),
    stdout: () => {},
    stderr: (text) => { stderr += text; }
  });
  assert.equal(stderr, "");
  assert.equal(code, 0);
});

test("CLI errors on a missing value or a value that looks like a flag", async () => {
  for (const argv of [["trending", "--geo"], ["trending", "--geo", "--hours", "24"]]) {
    let stderr = "";
    const code = await main(argv, { stdout: () => {}, stderr: (text) => { stderr += text; } });
    assert.equal(code, 2);
    assert.match(stderr, /Missing value for --geo/u);
  }
});

test("CLI rejects a bare non-flag argument", async () => {
  let stderr = "";
  const code = await main(["trending", "extra"], { stdout: () => {}, stderr: (text) => { stderr += text; } });
  assert.equal(code, 2);
  assert.match(stderr, /Unexpected argument: extra/u);
});

test("CLI --fallback none returns manual_review_required and never calls RSS", async () => {
  let calls = 0;
  let stdout = "";
  const code = await main(["trending", "--fallback", "none"], {
    fetchImpl: async () => { calls += 1; return response("upstream boom", 500); },
    stdout: (text) => { stdout += text; },
    stderr: () => {}
  });
  assert.equal(code, 0);
  const output = JSON.parse(stdout);
  assert.equal(output.fetch_status, "manual_review_required");
  assert.equal(output.source, "google_trending_now");
  assert.equal(output.items.length, 0);
  assert.equal(calls, 1);
});

test("CLI reports a combined error when both Google and RSS fail", async () => {
  let calls = 0;
  let stdout = "";
  const code = await main(["trending"], {
    fetchImpl: async () => { calls += 1; return response("boom", calls === 1 ? 502 : 500); },
    stdout: (text) => { stdout += text; },
    stderr: () => {}
  });
  assert.equal(code, 0);
  const output = JSON.parse(stdout);
  assert.equal(output.fetch_status, "manual_review_required");
  assert.equal(output.source, "rss_limited");
  assert.equal(output.items.length, 0);
  assert.match(output.error, /Google Trending Now failed:/u);
  assert.match(output.error, /RSS fallback failed:/u);
});

test("CLI healthcheck exits 1 when the primary source fails (no RSS masking)", async () => {
  let stdout = "";
  const code = await main(["healthcheck"], {
    fetchImpl: async () => response("down", 503),
    stdout: (text) => { stdout += text; },
    stderr: () => {}
  });
  assert.equal(code, 1);
  const output = JSON.parse(stdout);
  assert.equal(output.ok, false);
  assert.equal(output.fetch_status, "manual_review_required");
});

test("CLI healthcheck exits 0 on a successful primary fetch", async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  let stdout = "";
  const code = await main(["healthcheck"], {
    fetchImpl: async () => response(fixture),
    stdout: (text) => { stdout += text; },
    stderr: () => {}
  });
  assert.equal(code, 0);
  const output = JSON.parse(stdout);
  assert.equal(output.ok, true);
  assert.equal(output.fetch_status, "success");
});

test("CLI --include-raw adds raw to the json envelope; default stays clean", async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  const io = (sink) => ({
    fetchImpl: async () => response(fixture),
    stdout: (text) => { sink.out += text; },
    stderr: () => {}
  });

  const plain = { out: "" };
  assert.equal(await main(["trending", "--geo", "US", "--format", "json"], io(plain)), 0);
  assert.ok(!("raw" in JSON.parse(plain.out)));

  const withRaw = { out: "" };
  assert.equal(await main(["trending", "--geo", "US", "--format", "json", "--include-raw"], io(withRaw)), 0);
  assert.ok(Array.isArray(JSON.parse(withRaw.out).raw));
});

test('CLI accepts --limit all', async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  let out = "";
  const code = await main(
    ["trending", "--geo", "US", "--format", "json", "--limit", "all"],
    { fetchImpl: async () => response(fixture), stdout: (t) => { out += t; }, stderr: () => {} }
  );
  assert.equal(code, 0);
  assert.equal(JSON.parse(out).items.length, 2);
});
