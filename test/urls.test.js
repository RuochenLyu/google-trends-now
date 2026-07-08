import assert from "node:assert/strict";
import test from "node:test";

import { buildExploreUrl, buildRssUrl, buildTrendingPageUrl } from "../src/urls.js";

test("buildExploreUrl maps each supported window to its Explore date token", () => {
  assert.match(buildExploreUrl("q", "US", 4), /date=now\+4-H/u);
  assert.match(buildExploreUrl("q", "US", 24), /date=now\+1-d/u);
  assert.match(buildExploreUrl("q", "US", 48), /date=now\+7-d/u);
  assert.match(buildExploreUrl("q", "US", 168), /date=now\+7-d/u);
});

test("buildExploreUrl falls back to now 7-d for an unmapped window and encodes query and geo", () => {
  const url = buildExploreUrl("mars eclipse", "GB", 999);
  assert.match(url, /date=now\+7-d/u);
  assert.match(url, /geo=GB/u);
  assert.match(url, /q=mars\+eclipse/u);
});

test("buildTrendingPageUrl carries geo, hl, and hours, and applies defaults", () => {
  assert.equal(
    buildTrendingPageUrl({ geo: "US", hl: "en", hours: 48 }),
    "https://trends.google.com/trending?geo=US&hl=en&hours=48"
  );
  assert.match(buildTrendingPageUrl(), /geo=US&hl=en&hours=48/u);
});

test("buildRssUrl scopes to geo", () => {
  assert.equal(buildRssUrl({ geo: "JP" }), "https://trends.google.com/trending/rss?geo=JP");
  assert.match(buildRssUrl(), /geo=US/u);
});
