export const GOOGLE_TRENDING_BATCH_URL =
  "https://trends.google.com/_/TrendsUi/data/batchexecute";

export const GOOGLE_TRENDING_PAGE_URL = "https://trends.google.com/trending";

export const GOOGLE_TRENDING_RSS_URL = "https://trends.google.com/trending/rss";

export const TRENDING_NOW_RPC_ID = "i0OFE";

// Batch resolver for the news-article references carried on each trending row
// (row index 11: `[article_id, lang, geo]` triples).
export const TRENDING_NEWS_RPC_ID = "w4opAf";

export const allowedHours = Object.freeze([4, 24, 48, 168]);

export const allowedStatuses = Object.freeze(["all", "active", "ended"]);

export const allowedSorts = Object.freeze(["relevance", "volume", "recency", "title"]);

export const allowedFormats = Object.freeze(["json", "ndjson", "csv", "markdown"]);

export const allowedFallbacks = Object.freeze(["rss", "none"]);

export const sortKeys = Object.freeze({
  relevance: 1,
  volume: 2,
  recency: 3,
  title: 4
});

/**
 * Google Trends Explore accepts only a fixed set of `date` tokens. Map each
 * supported Trending Now window to the closest valid Explore token so that
 * generated `explore_url`s actually scope to a real range.
 */
export const exploreDateTokens = Object.freeze({
  4: "now 4-H",
  24: "now 1-d",
  48: "now 7-d",
  168: "now 7-d"
});

/** Default option values, referenced by the shared option normalizer. */
export const DEFAULTS = Object.freeze({
  geo: "US",
  hours: 48,
  category: "all",
  status: "all",
  sort: "relevance",
  limit: 100,
  hl: "en",
  fallback: "rss",
  format: "json",
  timeoutMs: 30000,
  retries: 0
});

/** Maximum number of trend-breakdown terms rendered in the compact Markdown table. */
export const MAX_TREND_BREAKDOWN = 5;
