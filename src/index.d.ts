export interface Category {
  id: number | string | null;
  name: string;
}

export interface CategoryRow {
  alias: string;
  id: number;
  name: string;
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
  categories: Category[];
  explore_url: string;
  source: "google_trending_now" | "rss_limited";
  rss_pub_date?: string | null;
}

export interface TrendingNowOptions {
  geo?: string;
  hours?: 4 | 24 | 48 | 168;
  category?: string | number;
  status?: "all" | "active" | "ended";
  sort?: "relevance" | "volume" | "recency" | "title";
  limit?: number;
  hl?: string;
  fallback?: "rss" | "none";
  timeoutMs?: number;
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
}

export const categories: Record<string, number>;
export function categoryRows(): CategoryRow[];

export function fetchTrendingNow(options?: TrendingNowOptions): Promise<TrendingNowOutput>;
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
export function parseBatchexecuteResponse(text: string, rpcId?: string): unknown;
export function trendingRowsFromPayload(payload: unknown): unknown[];
