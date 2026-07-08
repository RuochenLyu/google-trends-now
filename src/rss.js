import { GOOGLE_TRENDING_RSS_URL } from "./constants.js";
import { categoryId } from "./categories.js";
import { buildEnvelope } from "./envelope.js";
import { applyFiltersAndSort } from "./filter.js";
import { fetchText } from "./http.js";
import { searchVolumeLabel } from "./normalize.js";
import { normalizeFetchOptions } from "./options.js";
import { buildExploreUrl, buildRssUrl } from "./urls.js";

const NAMED_ENTITIES = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'"
});

function decodeXmlEntities(value) {
  // Single-pass replacement: matching against the original string (never the
  // substituted output) avoids double-decoding chained entities like `&amp;lt;`.
  return String(value ?? "")
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/u, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
      const token = entity.toLowerCase();
      if (token[0] === "#") {
        const codePoint = token[1] === "x"
          ? Number.parseInt(token.slice(2), 16)
          : Number.parseInt(token.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return Object.hasOwn(NAMED_ENTITIES, token) ? NAMED_ENTITIES[token] : match;
    });
}

function textForTag(block, localName) {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
    "iu"
  );
  const match = block.match(pattern);
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function allTextForTag(block, localName) {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
    "giu"
  );
  const values = [];
  for (const match of block.matchAll(pattern)) {
    const value = decodeXmlEntities(match[1].trim());
    if (value && !values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}

function parseApproxTraffic(value) {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/,/g, "").replace(/\+/g, "").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function parseTrendingRssXml(xml, options = {}) {
  const itemPattern = /<item\b[^>]*>([\s\S]*?)<\/item>/giu;
  const items = [];
  let rawPosition = 1;

  for (const match of String(xml ?? "").matchAll(itemPattern)) {
    const block = match[1];
    const query = textForTag(block, "title");
    const approxTraffic = textForTag(block, "approx_traffic");
    const pubDate = textForTag(block, "pubDate");

    items.push({
      position: rawPosition,
      raw_position: rawPosition,
      query,
      normalized_query: query,
      search_volume: parseApproxTraffic(approxTraffic),
      search_volume_label: approxTraffic || searchVolumeLabel(parseApproxTraffic(approxTraffic)),
      increase_percentage: null,
      started_at: null,
      ended_at: null,
      start_timestamp: null,
      end_timestamp: null,
      active: null,
      trend_breakdown: allTextForTag(block, "news_item_title"),
      // RSS carries no resolvable article references; keep the item shape
      // aligned with the batchexecute path.
      news_refs: [],
      categories: [],
      explore_url: buildExploreUrl(query, options.geo, options.hours),
      source: "rss_limited",
      rss_pub_date: pubDate || null
    });
    rawPosition += 1;
  }

  return items;
}

export async function fetchTrendingRss(options = {}) {
  const normalized = normalizeFetchOptions(options, { validate: true });
  const observedAt = new Date().toISOString();
  const sourceUrl = buildRssUrl({ geo: normalized.geo }) || GOOGLE_TRENDING_RSS_URL;
  const hasUnavailableCategoryFilter = categoryId(normalized.category) !== 0;
  const hasUnavailableStatusFilter = normalized.status !== "all";

  const xml = await fetchText(sourceUrl, {
    fetchImpl: normalized.fetchImpl,
    timeoutMs: normalized.timeoutMs,
    retries: normalized.retries,
    headers: {
      accept: "application/rss+xml,text/xml,*/*"
    }
  });

  // RSS exposes neither category nor status, so those filters are intentionally
  // not applied here; the caller is told via the *_filter_status markers below.
  const items = applyFiltersAndSort(parseTrendingRssXml(xml, { geo: normalized.geo, hours: normalized.hours }), {
    category: "all",
    status: "all",
    sort: normalized.sort,
    limit: normalized.limit
  });

  const extra = {};
  if (hasUnavailableCategoryFilter) {
    extra.category_filter_status = "unavailable_in_rss";
  }
  if (hasUnavailableStatusFilter) {
    extra.status_filter_status = "unavailable_in_rss";
  }

  return buildEnvelope({
    observedAt,
    options: normalized,
    source: "rss_limited",
    fetchStatus: "rss_limited",
    sourceUrl,
    error: null,
    items,
    extra
  });
}
