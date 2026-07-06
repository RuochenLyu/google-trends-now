import { readFileSync } from "node:fs";

import { DEFAULTS, allowedFormats } from "./constants.js";
import { categoryRows } from "./categories.js";
import { fetchTrendingNow } from "./client.js";
import { formatOutput } from "./formatters.js";
import { normalizeFetchOptions } from "./options.js";
import { fetchTrendingRss } from "./rss.js";

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
  --limit <number>         Default: 100
  --format <json|ndjson|csv|markdown>
  --hl <locale>            Default: en
  --fallback <rss|none>    Default: rss
  --timeout-ms <number>    Default: 30000
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
  "limit", "format", "hl", "fallback", "timeoutMs", "help"
]);

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

    // `--help` is the only boolean flag.
    if (rawName === "help") {
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
    stdout(formatOutput(output, options.format));
    return 0;
  } catch (error) {
    stderr(`google-trends-now: ${error.message}\n`);
    return 2;
  }
}
