import { categoryName } from "./categories.js";
import { DEFAULTS } from "./constants.js";
import { buildExploreUrl } from "./urls.js";

export function timestampFromList(value) {
  if (Array.isArray(value) && value.length > 0) {
    const timestamp = Number(value[0]);
    return Number.isFinite(timestamp) ? Math.trunc(timestamp) : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

export function isoFromTimestamp(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp * 1000).toISOString();
}

export function searchVolumeLabel(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${Math.trunc(numeric)}+`;
  }
  return String(value);
}

function normalizeCategory(raw) {
  if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
    const id = Number(raw);
    return { id, name: categoryName(id) };
  }
  if (raw && typeof raw === "object") {
    const id = raw.id ?? raw.category_id ?? raw.categoryId ?? null;
    const numericId = id === null ? null : Number(id);
    return {
      id: Number.isFinite(numericId) ? numericId : id,
      name: raw.name ?? (Number.isFinite(numericId) ? categoryName(numericId) : String(id ?? ""))
    };
  }
  return { id: raw, name: String(raw) };
}

/**
 * Normalize one Google Trends Trending Now row from the internal i0OFE payload.
 *
 * @param {unknown[]} row
 * @param {{ position?: number, hours?: number, geo?: string }} options
 * @returns {import("./types.js").TrendingNowItem}
 */
export function normalizeTrendingRow(row, options = {}) {
  const position = Number(options.position ?? 1);
  const query = typeof row?.[0] === "string" ? row[0] : "";
  const geo = typeof row?.[2] === "string" ? row[2] : options.geo ?? "";
  const startTimestamp = timestampFromList(row?.[3]);
  const endTimestamp = timestampFromList(row?.[4]);
  const searchVolume = row?.[6] ?? null;
  const increasePercentage = row?.[8] ?? null;
  const trendBreakdown = Array.isArray(row?.[9]) ? row[9].filter((item) => typeof item === "string") : [];
  const rawCategories = Array.isArray(row?.[10]) ? row[10] : [];
  const normalizedQuery = typeof row?.[12] === "string" && row[12] ? row[12] : query;

  return {
    position,
    raw_position: position,
    query,
    normalized_query: normalizedQuery,
    search_volume: searchVolume,
    search_volume_label: searchVolumeLabel(searchVolume),
    increase_percentage: increasePercentage,
    started_at: isoFromTimestamp(startTimestamp),
    ended_at: isoFromTimestamp(endTimestamp),
    start_timestamp: startTimestamp,
    end_timestamp: endTimestamp,
    active: endTimestamp === null,
    trend_breakdown: trendBreakdown,
    categories: rawCategories.map(normalizeCategory),
    explore_url: buildExploreUrl(normalizedQuery || query, geo, options.hours ?? DEFAULTS.hours),
    source: "google_trending_now"
  };
}
