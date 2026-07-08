export interface Category {
  id: number | string | null;
  name: string;
}

export interface CategoryRow {
  alias: string;
  id: number;
  name: string;
}

export interface NewsRef {
  id: number;
  lang: string;
  geo: string;
}

export interface TrendingNewsArticle {
  title: string;
  url: string | null;
  source: string | null;
  published_at: string | null;
  publish_timestamp: number | null;
  thumbnail_url: string | null;
}

export interface TrendingNewsOptions {
  hl?: string;
  geo?: string;
  timeoutMs?: number;
  /** Extra retry attempts for transient (429/5xx/network) failures. Default: 0. */
  retries?: number;
  fetchImpl?: typeof fetch;
}

export interface TrendingNowItem {
  position: number;
  raw_position: number;
  query: string;
  normalized_query: string;
  search_volume: number | string | null;
  search_volume_label: string | null;
  increase_percentage: number | string | null;
  started_at: string | null;
  ended_at: string | null;
  start_timestamp: number | null;
  end_timestamp: number | null;
  active: boolean | null;
  trend_breakdown: string[];
  news_refs: NewsRef[];
  categories: Category[];
  explore_url: string;
  source: "google_trending_now" | "rss_limited";
  rss_pub_date?: string | null;
  /**
   * Resolved news articles. Present only when the CLI `--with-news <n>` flag
   * attached them (trending command, json format); absent from the SDK path.
   */
  news?: TrendingNewsArticle[];
}

export interface TrendingNowOptions {
  geo?: string;
  hours?: 4 | 24 | 48 | 168;
  category?: string | number;
  status?: "all" | "active" | "ended";
  sort?: "relevance" | "volume" | "recency" | "title";
  /** Row-pool cap. `"all"` disables truncation. Default: 100. */
  limit?: number | "all";
  hl?: string;
  fallback?: "rss" | "none";
  timeoutMs?: number;
  /** Extra retry attempts for transient (429/5xx/network) failures. Default: 0. */
  retries?: number;
  /**
   * Attach the parsed batchexecute payload (pre-normalization) as `raw` on the
   * envelope. Google-path only; fallback/failure envelopes carry `raw: null`.
   */
  includeRaw?: boolean;
  fetchImpl?: typeof fetch;
}

export interface TrendingNowOutput {
  observed_at: string;
  geo: string;
  hours: number;
  category: string | number;
  status: string;
  sort: string;
  source: "google_trending_now" | "rss_limited";
  fetch_status: "success" | "rss_limited" | "manual_review_required";
  source_url: string;
  error: string | null;
  category_filter_status?: "unavailable_in_rss";
  status_filter_status?: "unavailable_in_rss";
  items: TrendingNowItem[];
  /** Present only when `includeRaw: true`; `null` on fallback/failure paths. */
  raw?: unknown;
}

export const categories: Record<string, number>;
export function categoryRows(): CategoryRow[];

export function fetchTrendingNow(options?: TrendingNowOptions): Promise<TrendingNowOutput>;
export function fetchTrendingNews(refs: Array<NewsRef | [number, string, string]>, options?: TrendingNewsOptions): Promise<TrendingNewsArticle[]>;
export function fetchTrendingRss(options?: TrendingNowOptions): Promise<TrendingNowOutput>;
export function normalizeTrendingRow(row: unknown[], options?: {
  position?: number;
  hours?: number;
  geo?: string;
}): TrendingNowItem;

export function formatJson(output: TrendingNowOutput): string;
export function formatNdjson(output: TrendingNowOutput): string;
export function formatCsv(output: TrendingNowOutput): string;
export function formatMarkdown(output: TrendingNowOutput): string;

export function parseTrendingRssXml(
  xml: string,
  options?: { geo?: string; hours?: number }
): TrendingNowItem[];

export function buildTrendingNowRequest(
  options?: TrendingNowOptions
): { url: string; body: URLSearchParams };
export function buildTrendingNewsRequest(
  refs: Array<NewsRef | [number, string, string]>,
  options?: { hl?: string; geo?: string }
): { url: string; body: URLSearchParams };
export function parseBatchexecuteResponse(text: string, rpcId?: string): unknown;
export function trendingRowsFromPayload(payload: unknown): unknown[];
export function newsArticlesFromPayload(payload: unknown): unknown[];

/** Structured error thrown by the HTTP layer on a non-2xx response. */
export class FetchHttpError extends Error {
  status: number;
  url: string;
  bodySnippet: string;
}
