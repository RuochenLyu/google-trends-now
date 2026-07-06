import {
  DEFAULTS,
  allowedFallbacks,
  allowedHours,
  allowedSorts,
  allowedStatuses
} from "./constants.js";
import { categoryId } from "./categories.js";

/**
 * Normalize and (optionally) validate fetch options shared by the CLI and the
 * public SDK entrypoints (`fetchTrendingNow`, `fetchTrendingRss`).
 *
 * Responsibilities that used to be duplicated across three call sites now live
 * here: applying defaults, coercing numeric fields, upper-casing `geo`,
 * resolving the `timeout_ms`/`fetch` aliases, and allowed-list validation. This
 * guarantees the SDK defaults and validates identically to the CLI.
 *
 * @param {Record<string, unknown>} raw
 * @param {{ validate?: boolean }} [config]
 * @returns {{
 *   geo: string, hours: number, category: string | number, status: string,
 *   sort: string, limit: number, hl: string, fallback: string,
 *   timeoutMs: number, fetchImpl?: typeof fetch
 * }}
 */
export function normalizeFetchOptions(raw = {}, { validate = true } = {}) {
  const options = {
    geo: String(raw.geo ?? DEFAULTS.geo).toUpperCase(),
    hours: Number(raw.hours ?? DEFAULTS.hours),
    category: raw.category ?? DEFAULTS.category,
    status: raw.status ?? DEFAULTS.status,
    sort: raw.sort ?? DEFAULTS.sort,
    limit: Number(raw.limit ?? DEFAULTS.limit),
    hl: raw.hl ?? DEFAULTS.hl,
    fallback: raw.fallback ?? DEFAULTS.fallback,
    timeoutMs: Number(raw.timeoutMs ?? raw.timeout_ms ?? DEFAULTS.timeoutMs),
    fetchImpl: raw.fetchImpl ?? raw.fetch
  };

  if (validate) {
    if (!allowedHours.includes(options.hours)) {
      throw new Error(`--hours must be one of: ${allowedHours.join(", ")}`);
    }
    if (!allowedStatuses.includes(options.status)) {
      throw new Error(`--status must be one of: ${allowedStatuses.join(", ")}`);
    }
    if (!allowedSorts.includes(options.sort)) {
      throw new Error(`--sort must be one of: ${allowedSorts.join(", ")}`);
    }
    if (!allowedFallbacks.includes(options.fallback)) {
      throw new Error(`--fallback must be one of: ${allowedFallbacks.join(", ")}`);
    }
    // Throws on an unknown non-numeric category; numeric ids pass for forward compat.
    categoryId(options.category);
    if (!Number.isInteger(options.limit) || options.limit < 0) {
      throw new Error("--limit must be a non-negative integer");
    }
    if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
      throw new Error("--timeout-ms must be a positive number");
    }
  } else {
    // Non-validating callers still get safe values instead of NaN.
    if (!Number.isInteger(options.limit) || options.limit < 0) {
      options.limit = DEFAULTS.limit;
    }
    if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
      options.timeoutMs = DEFAULTS.timeoutMs;
    }
  }

  return options;
}
