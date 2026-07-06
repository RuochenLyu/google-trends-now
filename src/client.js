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
  return rows.map((row, index) => normalizeTrendingRow(row, {
    position: index + 1,
    geo: options.geo,
    hours: options.hours
  }));
}

export async function fetchTrendingNow(options = {}) {
  const normalized = normalizeFetchOptions(options, { validate: true });
  const observedAt = new Date().toISOString();
  const sourceUrl = buildTrendingPageUrl(normalized);

  try {
    const items = applyFiltersAndSort(await fetchGoogleTrendingNow(normalized), normalized);
    return buildEnvelope({
      observedAt,
      options: normalized,
      source: "google_trending_now",
      fetchStatus: "success",
      sourceUrl,
      error: null,
      items
    });
  } catch (googleError) {
    if (normalized.fallback === "none") {
      return buildEnvelope({
        observedAt,
        options: normalized,
        source: "google_trending_now",
        fetchStatus: "manual_review_required",
        sourceUrl,
        error: String(googleError?.message ?? googleError),
        items: []
      });
    }

    try {
      const rssOutput = await fetchTrendingRss(normalized);
      return {
        ...rssOutput,
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
        items: []
      });
    }
  }
}
