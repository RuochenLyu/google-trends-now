import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseBatchexecuteResponse, trendingRowsFromPayload } from "../src/batchexecute.js";
import { normalizeTrendingRow } from "../src/normalize.js";

test("parses batchexecute fixture and normalizes rows", async () => {
  const fixture = await readFile(new URL("./fixtures/batchexecute.txt", import.meta.url), "utf8");
  const payload = parseBatchexecuteResponse(fixture);
  const rows = trendingRowsFromPayload(payload);
  assert.equal(rows.length, 2);

  const item = normalizeTrendingRow(rows[0], { position: 1, geo: "US", hours: 48 });
  assert.equal(item.query, "mars eclipse");
  assert.equal(item.search_volume, 50000);
  assert.equal(item.search_volume_label, "50000+");
  assert.equal(item.active, true);
  assert.deepEqual(item.categories, [
    { id: 18, name: "Technology" },
    { id: 15, name: "Science" }
  ]);
  assert.match(item.explore_url, /q=mars\+eclipse/u);
});

test("throws when requested RPC id is absent", () => {
  assert.throws(
    () => parseBatchexecuteResponse("[[\"wrb.fr\",\"other\",\"[]\"]]"),
    /did not include i0OFE/u
  );
});

test("parses a length-prefixed (chunked) batchexecute body", () => {
  const inner = JSON.stringify([null, [["x", null, "US", [1], null, null, 7, null, 1, [], [18], [], "x"]]]);
  const entry = JSON.stringify([["wrb.fr", "i0OFE", inner, null, null, null, "generic"]]);
  const body = `)]}'\n\n1234\n${entry}\n42\n${JSON.stringify([["di", 1]])}`;
  const rows = trendingRowsFromPayload(parseBatchexecuteResponse(body));
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], "x");
});
