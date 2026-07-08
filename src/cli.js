import { readFileSync } from "node:fs";

import { DEFAULTS, allowedFormats } from "./constants.js";
import { categoryRows } from "./categories.js";
import { fetchTrendingNews, fetchTrendingNow } from "./client.js";
import { formatOutput } from "./formatters.js";
import { normalizeFetchOptions } from "./options.js";
import { fetchTrendingRss } from "./rss.js";

// Upper bound on `--with-news`: news resolution is a serial per-item fetch, so
// the flag stays small to keep the extra request fan-out bounded.
const MAX_WITH_NEWS = 10;

const usage = `Usage:
  google-trends-now trending [options]
  google-trends-now rss [options]
  google-trends-now categories [--format json|ndjson|csv|markdown]
  google-trends-now healthcheck [options]
  google-trends-now --help | --version

Options:
  --geo <code>             Country/region code. Default: US
  --hours <4|24|48|168>    Trending Now window. Default: 48
  --category <alias|id>    Local category filter. Default: all
  --status <all|active|ended>
  --sort <relevance|volume|recency|title>
  --limit <number|all>     Default: 100; "all" disables truncation
  --format <json|ndjson|csv|markdown>
  --hl <locale>            Default: en
  --fallback <rss|none>    Default: rss
  --timeout-ms <number>    Default: 30000
  --retries <n>            Retry transient 429/5xx/network failures n times.
                           Default: 0 (off)
  --include-raw            Attach the pre-normalization batchexecute payload
                           as "raw" on the envelope (json format only)
  --with-news <n>          Resolve news articles for the first n items into a
                           "news" field (trending command, json format only;
                           1-10)
  -h, --help               Show this help
  -v, --version            Show the installed version

Exit codes:
  0  success
  1  healthcheck reported not-ok
  2  usage, validation, or runtime error
`;

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// camelCased option keys accepted by the commands (see parseArgv).
const KNOWN_OPTIONS = new Set([
  "geo", "hours", "category", "status", "sort",
  "limit", "format", "hl", "fallback", "timeoutMs", "retries",
  "includeRaw", "withNews", "help"
]);

// Flags that take no value.
const BOOLEAN_FLAGS = new Set(["help", "include-raw"]);

function toFlagName(key) {
  return key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}

function parseArgv(argv) {
  const command = argv[0];
  if (!command || command === "--help" || command === "-h") {
    return { command: "help", options: {} };
  }
  if (command === "--version" || command === "-v") {
    return { command: "version", options: {} };
  }

  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const name = rawName.replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());

    if (BOOLEAN_FLAGS.has(rawName)) {
      options[name] = true;
      continue;
    }
    // An explicit `--key=value` value is unambiguous, even if it starts with `--`.
    if (inlineValue !== undefined) {
      options[name] = inlineValue;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${rawName}`);
    }
    options[name] = value;
    index += 1;
  }

  return { command, options };
}

function normalizeOptions(rawOptions = {}) {
  for (const key of Object.keys(rawOptions)) {
    if (!KNOWN_OPTIONS.has(key)) {
      throw new Error(`Unknown option: --${toFlagName(key)}`);
    }
  }

  const format = rawOptions.format ?? DEFAULTS.format;
  if (!allowedFormats.includes(format)) {
    throw new Error(`--format must be one of: ${allowedFormats.join(", ")}`);
  }

  const options = normalizeFetchOptions(rawOptions, { validate: true });
  options.format = format;

  // `raw` and `news` only have a home in the json envelope; pairing either with
  // a flat format is a mistake, so fail fast instead of silently dropping data.
  if (options.includeRaw && format !== "json") {
    throw new Error("--include-raw requires --format json");
  }
  if (rawOptions.withNews !== undefined) {
    if (format !== "json") {
      throw new Error("--with-news requires --format json");
    }
    const withNews = Number(rawOptions.withNews);
    if (!Number.isInteger(withNews) || withNews < 1 || withNews > MAX_WITH_NEWS) {
      throw new Error(`--with-news must be an integer between 1 and ${MAX_WITH_NEWS}`);
    }
    options.withNews = withNews;
  }

  return options;
}

function formatCategories(format) {
  const rows = categoryRows();

  if (format === "csv") {
    const lines = ["alias,id,name"];
    for (const row of rows) {
      lines.push(`${row.alias},${row.id},${row.name}`);
    }
    return `${lines.join("\n")}\n`;
  }

  if (format === "ndjson") {
    return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  }

  if (format === "markdown") {
    const lines = [
      "| Alias | ID | Name |",
      "|---|---:|---|"
    ];
    for (const row of rows) {
      lines.push(`| ${row.alias} | ${row.id} | ${row.name} |`);
    }
    return `${lines.join("\n")}\n`;
  }

  return `${JSON.stringify(rows, null, 2)}\n`;
}

async function runHealthcheck(options) {
  const startedAt = Date.now();
  // Force `fallback: none` so healthcheck actually probes the primary Trending
  // Now endpoint instead of going green on an RSS fallback during an outage.
  const output = await fetchTrendingNow({ ...options, fallback: "none", limit: 1 });
  return {
    ok: output.fetch_status === "success" && output.items.length > 0,
    elapsed_ms: Date.now() - startedAt,
    fetch_status: output.fetch_status,
    source: output.source,
    error: output.error,
    item_count: output.items.length
  };
}

/**
 * Resolve news articles for the first `count` items (capped at the pool size)
 * and attach them as `item.news`. Calls are serial to keep the extra request
 * fan-out gentle on the undocumented endpoint. Items with no `news_refs` (e.g.
 * the RSS fallback path) resolve to `[]` without a network round-trip.
 */
async function attachNews(output, count, options) {
  const limit = Math.min(count, output.items.length);
  for (let index = 0; index < limit; index += 1) {
    const item = output.items[index];
    item.news = await fetchTrendingNews(item.news_refs, {
      hl: options.hl,
      geo: options.geo,
      timeoutMs: options.timeoutMs,
      retries: options.retries,
      fetchImpl: options.fetchImpl
    });
  }
}

export async function main(argv, io = {}) {
  const stdout = io.stdout ?? ((text) => process.stdout.write(text));
  const stderr = io.stderr ?? ((text) => process.stderr.write(text));

  try {
    const { command, options: rawOptions } = parseArgv(argv);

    if (command === "help") {
      stdout(usage);
      return 0;
    }

    if (command === "version") {
      stdout(`${packageJson.version}\n`);
      return 0;
    }

    if (!["trending", "rss", "categories", "healthcheck"].includes(command)) {
      throw new Error(`Unknown command: ${command}`);
    }

    const options = normalizeOptions(rawOptions);
    const fetchImpl = io.fetchImpl ?? io.fetch;

    // News resolution rides on each trending row's `news_refs`, which only the
    // trending command produces; reject the flag elsewhere rather than no-op.
    if (options.withNews && command !== "trending") {
      throw new Error("--with-news is only supported by the trending command");
    }

    if (command === "categories") {
      if (rawOptions.category !== undefined) {
        throw new Error("categories command does not accept --category");
      }
      stdout(formatCategories(options.format));
      return 0;
    }

    if (command === "rss") {
      const output = await fetchTrendingRss({ ...options, fetchImpl });
      stdout(formatOutput(output, options.format));
      return 0;
    }

    if (command === "healthcheck") {
      const output = await runHealthcheck({ ...options, fetchImpl });
      stdout(`${JSON.stringify(output, null, 2)}\n`);
      return output.ok ? 0 : 1;
    }

    const output = await fetchTrendingNow({ ...options, fetchImpl });
    if (options.withNews) {
      await attachNews(output, options.withNews, { ...options, fetchImpl });
    }
    stdout(formatOutput(output, options.format));
    return 0;
  } catch (error) {
    stderr(`google-trends-now: ${error.message}\n`);
    return 2;
  }
}
