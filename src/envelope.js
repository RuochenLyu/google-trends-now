/**
 * Build the standard Trending Now result envelope. All three fetch paths
 * (Google success, `manual_review_required`, and `rss_limited`) return the same
 * field set; routing them through one builder keeps the shape from drifting.
 *
 * @param {{
 *   observedAt: string,
 *   options: { geo: string, hours: number, category: string | number, status: string, sort: string },
 *   source: "google_trending_now" | "rss_limited",
 *   fetchStatus: "success" | "rss_limited" | "manual_review_required",
 *   sourceUrl: string,
 *   error?: string | null,
 *   items?: unknown[],
 *   extra?: Record<string, unknown>
 * }} args
 */
export function buildEnvelope({
  observedAt,
  options,
  source,
  fetchStatus,
  sourceUrl,
  error = null,
  items = [],
  extra = {}
}) {
  return {
    observed_at: observedAt,
    geo: options.geo,
    hours: options.hours,
    category: options.category,
    status: options.status,
    sort: options.sort,
    source,
    fetch_status: fetchStatus,
    source_url: sourceUrl,
    error,
    items,
    ...extra
  };
}
