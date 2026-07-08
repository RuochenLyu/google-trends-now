import {
  buildTrendingNewsRequest,
  buildTrendingNowRequest,
  newsArticlesFromPayload,
  parseBatchexecuteResponse,
  trendingRowsFromPayload
} from "./batchexecute.js";
import { TRENDING_NEWS_RPC_ID } from "./constants.js";
import { isoFromTimestamp, timestampFromList } from "./normalize.js";
import { buildEnvelope } from "./envelope.js";
import { applyFiltersAndSort } from "./filter.js";
import { fetchText } from "./http.js";
import { normalizeTrendingRow } from "./normalize.js";
import { normalizeFetchOptions } from "./options.js";
import { fetchTrendingRss } from "./rss.js";
import { buildTrendingPageUrl } from "./urls.js";

async function fetchGoogleTrendingNow(options) {
  const { url, body } = buildTrendingNowRequest(options);
  const text = await fetchText(url, {
    method: "POST",
    body,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    headers: {
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      origin: "https://trends.google.com",
      referer: "https://trends.google.com/trending"
    }
  });
  const parsed = parseBatchexecuteResponse(text);
  const rows = trendingRowsFromPayload(parsed);
  const items = rows.map((row, index) => normalizeTrendingRow(row, {
    position: index + 1,
    geo: options.geo,
    hours: options.hours
  }));
  // `rawPayload` is the parsed batchexecute payload before normalization; it is
  // only attached to the envelope when the caller opts in via `includeRaw`.
  return { items, rawPayload: parsed };
}

/**
 * Resolve trending-row news references (`item.news_refs`) into article details
 * via the w4opAf batch RPC. Google-path only; there is no RSS fallback for
 * this endpoint.
 *
 * @param {Array<{ id: number, lang?: string, geo?: string } | [number, string, string]>} refs
 * @param {{ hl?: string, geo?: string, timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<Array<{ title: string, url: string | null, source: string | null,
 *   published_at: string | null, publish_timestamp: number | null, thumbnail_url: string | null }>>}
 */
export async function fetchTrendingNews(refs, options = {}) {
  if (!Array.isArray(refs) || refs.length === 0) {
    return [];
  }
  const { url, body } = buildTrendingNewsRequest(refs, options);
  const text = await fetchText(url, {
    method: "POST",
    body,
    fetchImpl: options.fetchImpl ?? options.fetch,
    timeoutMs: options.timeoutMs ?? options.timeout_ms,
    headers: {
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      origin: "https://trends.google.com",
      referer: "https://trends.google.com/trending"
    }
  });
  const payload = parseBatchexecuteResponse(text, TRENDING_NEWS_RPC_ID);
  return newsArticlesFromPayload(payload).map((article) => {
    const timestamp = timestampFromList(article[3]);
    return {
      title: article[0],
      url: typeof article[1] === "string" ? article[1] : null,
      source: typeof article[2] === "string" ? article[2] : null,
      published_at: isoFromTimestamp(timestamp),
      publish_timestamp: timestamp,
      thumbnail_url: typeof article[4] === "string" ? article[4] : null
    };
  });
}

export async function fetchTrendingNow(options = {}) {
  const normalized = normalizeFetchOptions(options, { validate: true });
  const observedAt = new Date().toISOString();
  const sourceUrl = buildTrendingPageUrl(normalized);

  try {
    const { items: fetched, rawPayload } = await fetchGoogleTrendingNow(normalized);
    const items = applyFiltersAndSort(fetched, normalized);
    return buildEnvelope({
      observedAt,
      options: normalized,
      source: "google_trending_now",
      fetchStatus: "success",
      sourceUrl,
      error: null,
      items,
      // Opt-in only: default envelopes stay byte-identical without the key.
      extra: normalized.includeRaw ? { raw: rawPayload } : {}
    });
  } catch (googleError) {
    // Raw passthrough is a Google-path capability; fallback and failure
    // envelopes carry `raw: null` when requested so consumers see one shape.
    const rawExtra = normalized.includeRaw ? { raw: null } : {};

    if (normalized.fallback === "none") {
      return buildEnvelope({
        observedAt,
        options: normalized,
        source: "google_trending_now",
        fetchStatus: "manual_review_required",
        sourceUrl,
        error: String(googleError?.message ?? googleError),
        items: [],
        extra: rawExtra
      });
    }

    try {
      const rssOutput = await fetchTrendingRss(normalized);
      return {
        ...rssOutput,
        ...rawExtra,
        observed_at: observedAt,
        error: `Google Trending Now failed: ${googleError.message}; RSS fallback returned limited data`
      };
    } catch (rssError) {
      return buildEnvelope({
        observedAt,
        options: normalized,
        source: "rss_limited",
        fetchStatus: "manual_review_required",
        sourceUrl,
        error: `Google Trending Now failed: ${googleError.message}; RSS fallback failed: ${rssError.message}`,
        items: [],
        extra: rawExtra
      });
    }
  }
}
