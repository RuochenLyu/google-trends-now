import assert from "node:assert/strict";
import test from "node:test";

import { formatCsv, formatJson, formatMarkdown, formatNdjson } from "../src/formatters.js";

const output = {
  observed_at: "2026-07-06T00:00:00.000Z",
  geo: "US",
  hours: 48,
  category: "all",
  status: "all",
  sort: "relevance",
  source: "google_trending_now",
  fetch_status: "success",
  source_url: "https://trends.google.com/trending?geo=US",
  error: null,
  items: [
    {
      position: 1,
      raw_position: 1,
      query: "mars eclipse",
      normalized_query: "mars eclipse",
      search_volume: 50000,
      search_volume_label: "50000+",
      increase_percentage: 200,
      started_at: "2024-03-09T16:00:00.000Z",
      ended_at: null,
      active: true,
      trend_breakdown: ["mars eclipse", "planet watch"],
      categories: [{ id: 18, name: "Technology" }],
      source: "google_trending_now",
      explore_url: "https://trends.google.com/trends/explore?q=mars+eclipse"
    }
  ]
};

test("formats JSON", () => {
  assert.equal(JSON.parse(formatJson(output)).items[0].query, "mars eclipse");
});

test("formats NDJSON", () => {
  const lines = formatNdjson(output).trim().split("\n");
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).query, "mars eclipse");
});

test("formats CSV", () => {
  const csv = formatCsv(output);
  assert.match(csv, /^position,raw_position,query/u);
  assert.match(csv, /mars eclipse/u);
  assert.match(csv, /Technology/u);
});

test("formats Markdown", () => {
  const markdown = formatMarkdown(output);
  assert.match(markdown, /Google Trends Trending Now/u);
  assert.match(markdown, /\| 1 \| mars eclipse/u);
});

test("CSV quotes commas, quotes, and doubles embedded quotes", () => {
  const csv = formatCsv({
    items: [{ position: 1, query: "a,b", normalized_query: 'she said "hi"', categories: [], trend_breakdown: [] }]
  });
  assert.match(csv, /"a,b"/u);
  assert.match(csv, /"she said ""hi"""/u);
});

test("CSV neutralizes spreadsheet formula-injection cells", () => {
  const csv = formatCsv({
    items: [{ position: 1, query: "=1+1", normalized_query: "@cmd", categories: [], trend_breakdown: [] }]
  });
  assert.match(csv, /'=1\+1/u);
  assert.match(csv, /'@cmd/u);
});

test("CSV does not quote a plain value", () => {
  const csv = formatCsv({
    items: [{ position: 1, query: "mars eclipse", categories: [], trend_breakdown: [] }]
  });
  assert.ok(!csv.split("\n")[1].includes("\""));
});

test("Markdown escapes pipes, flattens newlines, and renders empty cells as -", () => {
  const markdown = formatMarkdown({
    geo: "US",
    observed_at: "t",
    fetch_status: "success",
    source: "google_trending_now",
    items: [{
      position: 1,
      query: "a | b\nc",
      search_volume_label: null,
      increase_percentage: null,
      started_at: null,
      active: true,
      categories: [],
      trend_breakdown: []
    }]
  });
  assert.match(markdown, /a \\\| b c/u);
  assert.match(markdown, /\| - \|/u);
});

test("empty items produce stable per-format output", () => {
  const empty = { geo: "US", observed_at: "t", fetch_status: "manual_review_required", source: "google_trending_now", error: null, items: [] };
  assert.equal(formatNdjson(empty), "");
  const csv = formatCsv(empty);
  assert.match(csv, /^position,raw_position,query/u);
  assert.equal(csv.trim().split("\n").length, 1);
  assert.match(formatMarkdown(empty), /\| # \| Query \|/u);
});
