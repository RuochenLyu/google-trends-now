# google-trends-now

English | [简体中文](#简体中文)

[![CI](https://github.com/RuochenLyu/google-trends-now/actions/workflows/ci.yml/badge.svg)](https://github.com/RuochenLyu/google-trends-now/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/google-trends-now.svg)](https://www.npmjs.com/package/google-trends-now)
[![node](https://img.shields.io/node/v/google-trends-now.svg)](https://nodejs.org)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Unofficial CLI and Node.js client for **Google Trends Trending Now**, with an RSS fallback. Zero runtime dependencies.

> Not an official Google client. It reads the current Trending Now web data path and falls back to Google Trends RSS when that path fails. RSS is a limited best-effort fallback, not the full Trending Now pool. Google's official Trends API alpha targets scaled search-interest data and does not yet cover this hot-word discovery use case.

## Install

Requires Node.js >= 22 (built-in `fetch`, `AbortSignal.timeout`, `Array.prototype.toSorted`).

```bash
npm install google-trends-now
```

## CLI

```bash
google-trends-now trending --geo US --hours 48 --format json
google-trends-now trending --category technology --status active --format ndjson
google-trends-now rss --geo US --format json
google-trends-now categories
google-trends-now healthcheck
```

| Option | Values | Default |
|---|---|---|
| `--geo` | country/region code | `US` |
| `--hours` | `4` `24` `48` `168` | `48` |
| `--category` | alias or numeric id | `all` |
| `--status` | `all` `active` `ended` | `all` |
| `--sort` | `relevance` `volume` `recency` `title` | `relevance` |
| `--limit` | integer or `all` (no truncation) | `100` |
| `--format` | `json` `ndjson` `csv` `markdown` | `json` |
| `--hl` | locale | `en` |
| `--fallback` | `rss` `none` | `rss` |
| `--timeout-ms` | integer | `30000` |
| `--include-raw` | flag; attach the pre-normalization batchexecute payload as `raw` (json format) | off |
| `-h, --help` · `-v, --version` | | |

Category filtering is always applied locally against each row's `categories[]`; the request-side category is only an upstream hint. Unknown categories and misspelled flags (e.g. `--categroy`) fail fast rather than being silently ignored.

- **Exit codes:** `0` success · `1` healthcheck not-ok · `2` usage/validation/runtime error.
- **`healthcheck`** probes the primary endpoint only (forces `--fallback none`, so RSS can't mask an outage) and always prints JSON `{ ok, elapsed_ms, fetch_status, source, error, item_count }`. `ok` is `true` only on `fetch_status: "success"` with at least one item; the process exits `0`/`1` accordingly.
- **`categories`** prints the alias table and honors `--format`; its `json` output is a bare `[{ alias, id, name }]` array, not the result envelope.

## SDK

```js
import { fetchTrendingNews, fetchTrendingNow, fetchTrendingRss, formatMarkdown } from "google-trends-now";

const output = await fetchTrendingNow({
  geo: "US",
  hours: 48,
  category: "technology",
  status: "active",
  limit: 25
});

console.log(formatMarkdown(output));

const news = await fetchTrendingNews(output.items[0].news_refs.slice(0, 5));
console.log(news[0]?.title); // resolved article headline

const rss = await fetchTrendingRss({ geo: "US", limit: 10 });
console.log(rss.fetch_status); // "rss_limited"
```

Also exported: `categories`, `categoryRows`, `normalizeTrendingRow`, `formatJson`, `formatNdjson`, `formatCsv`, `parseTrendingRssXml`, and the low-level `batchexecute` helpers. Full field types ship in the bundled `index.d.ts`.

## Output schema

`fetchTrendingNow(options)` resolves to an envelope:

```js
{
  observed_at: "2026-07-06T00:00:00.000Z",
  geo: "US", hours: 48, category: "all", status: "all", sort: "relevance",
  source: "google_trending_now",   // or "rss_limited"
  fetch_status: "success",         // or "rss_limited" | "manual_review_required"
  source_url: "https://trends.google.com/trending?geo=US&hl=en&hours=48",
  error: null,
  items: [ /* ... */ ]
}
```

`category_filter_status` / `status_filter_status` are optional keys added **only** on RSS output when a `category`/`status` filter was requested (see [RSS fallback](#rss-fallback)); they are absent on the normal path.

Each item:

```js
{
  position: 1, raw_position: 1,
  query: "example trend", normalized_query: "example trend",
  search_volume: 50000, search_volume_label: "50000+",
  increase_percentage: 200,
  started_at: "2026-07-06T00:00:00.000Z", ended_at: null,
  start_timestamp: 1783296000, end_timestamp: null,
  active: true,
  trend_breakdown: ["example trend"],
  categories: [{ id: 18, name: "Technology" }],
  explore_url: "https://trends.google.com/trends/explore?...",
  source: "google_trending_now"
}
```

## Formats

| Format | Output |
|---|---|
| `json` | full envelope |
| `ndjson` | one normalized item per line |
| `csv` | flat rows; categories and breakdown joined by `;` (formula-injection safe) |
| `markdown` | compact report table |

## RSS fallback

When the Trending Now request fails and `--fallback rss` is on, the client fetches `https://trends.google.com/trending/rss?geo=<geo>` and marks the output `source: "rss_limited"`, `fetch_status: "rss_limited"`.

RSS lacks the category, active-status, and full trend-pool fields of Trending Now, so it is best-effort only. If a `category`/`status` filter was requested, the rows are kept and flagged with `category_filter_status`/`status_filter_status: "unavailable_in_rss"`.

## Disclaimer & license

Google Trends numbers are approximate search-interest signals: volume labels are not sales, demand, or market size, and trending rank is not opportunity rank. The internal endpoint is undocumented and may change, throttle, or require manual review; this package uses no browser automation, login, proxy rotation, or CAPTCHA bypass.

MIT licensed ([LICENSE](LICENSE)). "Google" and "Google Trends" are trademarks of Google; this project is unofficial and not endorsed by Google.

## Development

```bash
npm test                                  # node --test, no network
node bin/google-trends-now.mjs categories # offline smoke check
npx . trending --geo US --limit 5         # run from a checkout
npm pack --dry-run                        # inspect the publishable tarball
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CHANGELOG.md](CHANGELOG.md).

---

# 简体中文

非官方 Google Trends **Trending Now** 命令行工具和 Node.js SDK，带 RSS 兜底。零运行时依赖。

> 不是 Google 官方客户端。它优先读取当前 Trending Now 网页数据路径，失败时降级读取 Google Trends RSS。RSS 只是有限的 best-effort 兜底，不是完整 Trending Now 池。Google 官方 Trends API alpha 面向可缩放的搜索兴趣数据，暂不覆盖本项目的热词发现用途。

## 安装

需要 Node.js >= 22（内置 `fetch`、`AbortSignal.timeout`、`Array.prototype.toSorted`）。

```bash
npm install google-trends-now
```

## 命令行

```bash
google-trends-now trending --geo US --hours 48 --format json
google-trends-now trending --category technology --status active --format ndjson
google-trends-now rss --geo US --format json
google-trends-now categories
google-trends-now healthcheck
```

| 参数 | 取值 | 默认 |
|---|---|---|
| `--geo` | 国家/地区代码 | `US` |
| `--hours` | `4` `24` `48` `168` | `48` |
| `--category` | 别名或数字 id | `all` |
| `--status` | `all` `active` `ended` | `all` |
| `--sort` | `relevance` `volume` `recency` `title` | `relevance` |
| `--limit` | 整数或 `all`（不截断） | `100` |
| `--format` | `json` `ndjson` `csv` `markdown` | `json` |
| `--hl` | 语言 locale | `en` |
| `--fallback` | `rss` `none` | `rss` |
| `--timeout-ms` | 整数 | `30000` |
| `--include-raw` | 布尔开关；在 json 输出的信封上附加 normalize 前的原始 batchexecute payload（`raw` 字段） | 关 |
| `-h, --help` · `-v, --version` | | |

分类过滤一定基于每条结果返回的 `categories[]` 在本地执行；请求参数里的分类只是上游提示。未知分类和拼错的参数（例如 `--categroy`）会直接报错，而不是被静默忽略。

- **退出码：** `0` 成功 · `1` healthcheck not-ok · `2` 用法/校验/运行时错误。
- **`healthcheck`** 只探测主接口（内部强制 `--fallback none`，RSS 兜底不会掩盖故障），并且始终输出 JSON `{ ok, elapsed_ms, fetch_status, source, error, item_count }`。只有 `fetch_status: "success"` 且至少一条结果时 `ok` 才为 `true`，进程据此退出 `0`/`1`。
- **`categories`** 打印分类别名表并支持 `--format`；它的 `json` 输出是裸数组 `[{ alias, id, name }]`，不是结果包。

## SDK

```js
import { fetchTrendingNow, fetchTrendingRss, formatMarkdown } from "google-trends-now";

const output = await fetchTrendingNow({
  geo: "US",
  hours: 48,
  category: "technology",
  status: "active",
  limit: 25
});

console.log(formatMarkdown(output));

const rss = await fetchTrendingRss({ geo: "US", limit: 10 });
console.log(rss.fetch_status); // "rss_limited"
```

另外导出：`categories`、`categoryRows`、`normalizeTrendingRow`、`formatJson`、`formatNdjson`、`formatCsv`、`parseTrendingRssXml`，以及底层 `batchexecute` 辅助函数。完整字段类型见随包发布的 `index.d.ts`。

## 输出结构

`fetchTrendingNow(options)` 返回一个结果包：

```js
{
  observed_at: "2026-07-06T00:00:00.000Z",
  geo: "US", hours: 48, category: "all", status: "all", sort: "relevance",
  source: "google_trending_now",   // 或 "rss_limited"
  fetch_status: "success",         // 或 "rss_limited" | "manual_review_required"
  source_url: "https://trends.google.com/trending?geo=US&hl=en&hours=48",
  error: null,
  items: [ /* ... */ ]
}
```

`category_filter_status` / `status_filter_status` 是可选字段，**仅**在使用 RSS 且请求了 `category`/`status` 过滤时出现（见 [RSS 兜底](#rss-兜底)），正常路径上不会有。

单条结果：

```js
{
  position: 1, raw_position: 1,
  query: "example trend", normalized_query: "example trend",
  search_volume: 50000, search_volume_label: "50000+",
  increase_percentage: 200,
  started_at: "2026-07-06T00:00:00.000Z", ended_at: null,
  start_timestamp: 1783296000, end_timestamp: null,
  active: true,
  trend_breakdown: ["example trend"],
  categories: [{ id: 18, name: "Technology" }],
  explore_url: "https://trends.google.com/trends/explore?...",
  source: "google_trending_now"
}
```

## 输出格式

| 格式 | 输出 |
|---|---|
| `json` | 完整结果包 |
| `ndjson` | 每行一条标准化结果 |
| `csv` | 扁平表格；分类名和 breakdown 用 `;` 连接（已防 CSV 公式注入） |
| `markdown` | 适合报告的紧凑表格 |

## RSS 兜底

当 Trending Now 请求失败且启用 `--fallback rss` 时，客户端会请求 `https://trends.google.com/trending/rss?geo=<geo>`，并把输出标记为 `source: "rss_limited"`、`fetch_status: "rss_limited"`。

RSS 不含 Trending Now 的分类、活跃状态和完整趋势池字段，只能作为 best-effort 兜底。如果请求了 `category`/`status` 过滤，结果会保留并标记 `category_filter_status`/`status_filter_status: "unavailable_in_rss"`。

## 免责声明与协议

Google Trends 数值是近似搜索兴趣信号：搜索量标签不等于销量、需求或市场规模，Trending rank 也不等于机会排序。内部接口没有官方文档，可能变化、限流或需要人工复核；本项目不使用浏览器自动化、登录、代理轮换或验证码绕过。

MIT 协议（[LICENSE](LICENSE)）。"Google"、"Google Trends" 是 Google 的商标；本项目为非官方项目，未获 Google 背书。

## 开发

```bash
npm test                                  # node --test，无网络
node bin/google-trends-now.mjs categories # 离线冒烟检查
npx . trending --geo US --limit 5         # 在源码仓库中直接运行
npm pack --dry-run                        # 查看可发布 tarball
```

参见 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md) 和 [CHANGELOG.md](CHANGELOG.md)。
