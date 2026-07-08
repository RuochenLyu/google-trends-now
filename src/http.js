const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// Upper bound for any single backoff wait, including a server-supplied
// `Retry-After`. Retrying is meant to ride out a single blip, not to sit and
// wait out a full rate-limit window.
const MAX_BACKOFF_MS = 30000;

/**
 * Structured error thrown for a non-2xx HTTP response. The `message` keeps the
 * historical `HTTP <status> for <url>: <snippet>` shape; the extra fields let
 * callers branch on `status` without parsing the string.
 */
export class FetchHttpError extends Error {
  constructor(message, { status, url, bodySnippet }) {
    super(message);
    this.name = "FetchHttpError";
    this.status = status;
    this.url = url;
    this.bodySnippet = bodySnippet;
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getHeader(headers, name) {
  if (!headers) {
    return null;
  }
  if (typeof headers.get === "function") {
    return headers.get(name);
  }
  const lower = name.toLowerCase();
  return headers[lower] ?? headers[name] ?? null;
}

// Short linear backoff for retryable failures without a server hint: one second
// times the attempt number, so waits grow gently across attempts.
function backoffMs(attempt) {
  return 1000 * attempt;
}

// Resolve a 429 `Retry-After` header (delta-seconds or an HTTP date) into a
// wait in milliseconds, capped at MAX_BACKOFF_MS. Falls back to linear backoff
// when the header is missing or unparseable.
function retryAfterMs(headers, attempt) {
  const value = getHeader(headers, "retry-after");
  if (value !== null && value !== undefined && value !== "") {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds, 0) * 1000, MAX_BACKOFF_MS);
    }
    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) {
      return Math.min(Math.max(dateMs - Date.now(), 0), MAX_BACKOFF_MS);
    }
  }
  return backoffMs(attempt);
}

function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Fetch a URL and return its body text, throwing a `FetchHttpError` on a
 * non-2xx response.
 *
 * `retries` (default 0, so behavior is unchanged unless opted in) enables a
 * restrained retry: only 429 and 5xx responses and network-layer failures are
 * retried, at most `retries` extra times. A 429 honors `Retry-After` (seconds
 * or an HTTP date, capped at 30s); everything else uses a short linear backoff.
 * This is deliberately a defense against a single transient blip, not a way to
 * grind past rate limiting.
 *
 * @param {string} url
 * @param {{
 *   fetchImpl?: typeof fetch, timeoutMs?: number, headers?: Record<string, string>,
 *   retries?: number, sleep?: (ms: number) => Promise<void>
 * }} [options]
 * @returns {Promise<string>}
 */
export async function fetchText(url, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = 30000,
    headers = {},
    retries = 0,
    // Injectable so tests can drive the retry path without real timers.
    sleep = defaultSleep,
    ...requestOptions
  } = options;

  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetch is not available; Node.js >=22 is required");
  }

  const maxAttempts = Math.max(0, Number(retries) || 0) + 1;

  for (let attempt = 1; ; attempt += 1) {
    // A fresh timeout signal per attempt: `AbortSignal.timeout` fires once, so
    // reusing one across retries would pre-abort every attempt after the first.
    const signal =
      requestOptions.signal ??
      (typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined);

    let response;
    try {
      response = await fetchImpl(url, {
        ...requestOptions,
        signal,
        headers: {
          "user-agent": DEFAULT_USER_AGENT,
          accept: "*/*",
          ...headers
        }
      });
    } catch (networkError) {
      // A thrown fetch is a network-layer failure (DNS, reset, timeout); treat
      // it as retryable under the same attempt budget as a 5xx.
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw networkError;
    }

    const text = await response.text();
    if (response.ok) {
      return text;
    }

    const snippet = text.replace(/\s+/g, " ").slice(0, 240);
    const error = new FetchHttpError(`HTTP ${response.status} for ${url}: ${snippet}`, {
      status: response.status,
      url,
      bodySnippet: snippet
    });

    if (isRetryableStatus(response.status) && attempt < maxAttempts) {
      const delay = response.status === 429
        ? retryAfterMs(response.headers, attempt)
        : backoffMs(attempt);
      await sleep(delay);
      continue;
    }

    throw error;
  }
}
