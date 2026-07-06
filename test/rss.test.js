import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { fetchTrendingRss, parseTrendingRssXml } from "../src/rss.js";

function response(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return text;
    }
  };
}

test("parses RSS fixture", async () => {
  const fixture = await readFile(new URL("./fixtures/rss.xml", import.meta.url), "utf8");
  const items = parseTrendingRssXml(fixture, { geo: "US", hours: 24 });
  assert.equal(items.length, 2);
  assert.equal(items[0].query, "space telescope");
  assert.equal(items[0].search_volume, 20000);
  assert.equal(items[0].search_volume_label, "20,000+");
  assert.equal(items[0].source, "rss_limited");
  assert.deepEqual(items[0].trend_breakdown, ["Space telescope's camera spots new planet"]);
});

test("decodes CDATA, named, decimal, and hex entities without double-decoding", () => {
  const xml = "<rss><channel><item><title>"
    + "<![CDATA[AT&amp;T &#38; &#x263A; &amp;lt; &quot;q&quot;]]>"
    + "</title></item></channel></rss>";
  const items = parseTrendingRssXml(xml, { geo: "US", hours: 24 });
  assert.equal(items[0].query, "AT&T & ☺ &lt; \"q\"");
});

test("RSS keeps items when category filtering is unavailable", async () => {
  const fixture = await readFile(new URL("./fixtures/rss.xml", import.meta.url), "utf8");
  const output = await fetchTrendingRss({
    geo: "US",
    category: "technology",
    fetchImpl: async () => response(fixture)
  });

  assert.equal(output.fetch_status, "rss_limited");
  assert.equal(output.category_filter_status, "unavailable_in_rss");
  assert.equal(output.items.length, 2);
});
