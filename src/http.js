const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export async function fetchText(url, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = 30000,
    headers = {},
    ...requestOptions
  } = options;

  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetch is not available; Node.js >=22 is required");
  }

  const signal =
    requestOptions.signal ??
    (typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined);

  const response = await fetchImpl(url, {
    ...requestOptions,
    signal,
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "*/*",
      ...headers
    }
  });

  const text = await response.text();
  if (!response.ok) {
    const snippet = text.replace(/\s+/g, " ").slice(0, 240);
    throw new Error(`HTTP ${response.status} for ${url}: ${snippet}`);
  }
  return text;
}
