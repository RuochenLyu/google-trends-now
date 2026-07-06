import { MAX_TREND_BREAKDOWN } from "./constants.js";

function csvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  let text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  // Neutralize CSV formula injection: trend queries are third-party data, and a
  // cell starting with = + - @ tab or CR is executed as a formula by spreadsheets.
  if (/^[=+\-@\t\r]/u.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/u.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function markdownCell(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function formatJson(output) {
  return `${JSON.stringify(output, null, 2)}\n`;
}

export function formatNdjson(output) {
  return output.items.map((item) => JSON.stringify(item)).join("\n") + (output.items.length ? "\n" : "");
}

export function formatCsv(output) {
  const fields = [
    "position",
    "raw_position",
    "query",
    "normalized_query",
    "search_volume",
    "search_volume_label",
    "increase_percentage",
    "started_at",
    "ended_at",
    "active",
    "trend_breakdown",
    "categories",
    "source",
    "explore_url"
  ];
  const lines = [fields.join(",")];
  for (const item of output.items) {
    lines.push(fields.map((field) => {
      if (field === "trend_breakdown") {
        return csvValue((item.trend_breakdown ?? []).join("; "));
      }
      if (field === "categories") {
        return csvValue((item.categories ?? []).map((category) => category.name ?? category.id).join("; "));
      }
      return csvValue(item[field]);
    }).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function formatMarkdown(output) {
  const lines = [
    `# Google Trends Trending Now - ${markdownCell(output.geo)}`,
    "",
    `Observed at: \`${markdownCell(output.observed_at)}\``,
    `Fetch status: \`${markdownCell(output.fetch_status)}\` Source: \`${markdownCell(output.source)}\``,
    ""
  ];

  if (output.error) {
    lines.push(`Error: \`${markdownCell(output.error)}\``, "");
  }

  lines.push(
    "| # | Query | Volume | Growth | Started | Active | Categories | Breakdown |",
    "|---:|---|---:|---:|---|---|---|---|"
  );

  for (const item of output.items) {
    lines.push(`| ${item.position} | ${markdownCell(item.query)} | ${markdownCell(item.search_volume_label)} | ${markdownCell(item.increase_percentage)} | ${markdownCell(item.started_at)} | ${markdownCell(item.active)} | ${markdownCell((item.categories ?? []).map((category) => category.name).join(", "))} | ${markdownCell((item.trend_breakdown ?? []).slice(0, MAX_TREND_BREAKDOWN).join(", "))} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatOutput(output, format) {
  if (format === "ndjson") {
    return formatNdjson(output);
  }
  if (format === "csv") {
    return formatCsv(output);
  }
  if (format === "markdown") {
    return formatMarkdown(output);
  }
  return formatJson(output);
}
