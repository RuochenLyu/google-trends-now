import { buildTrendingNowRequest, parseBatchexecuteResponse, trendingRowsFromPayload } from "./batchexecute.js";
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
