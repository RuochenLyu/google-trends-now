import {
  DEFAULTS,
  GOOGLE_TRENDING_PAGE_URL,
  GOOGLE_TRENDING_RSS_URL,
  exploreDateTokens
} from "./constants.js";

export function buildExploreUrl(query, geo = DEFAULTS.geo, hours = DEFAULTS.hours) {
  const params = new URLSearchParams({
    // Explore only honors a fixed token set; map the window to the nearest valid one.
    date: exploreDateTokens[Number(hours)] ?? "now 7-d",
    geo,
    q: query
  });
  return `https://trends.google.com/trends/explore?${params}`;
}

export function buildTrendingPageUrl(options = {}) {
  const params = new URLSearchParams({
    geo: options.geo ?? DEFAULTS.geo,
    hl: options.hl ?? DEFAULTS.hl,
    hours: String(options.hours ?? DEFAULTS.hours)
  });
  return `${GOOGLE_TRENDING_PAGE_URL}?${params}`;
}

export function buildRssUrl(options = {}) {
  const params = new URLSearchParams({
    geo: options.geo ?? DEFAULTS.geo
  });
  return `${GOOGLE_TRENDING_RSS_URL}?${params}`;
}
