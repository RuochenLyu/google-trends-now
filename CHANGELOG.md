# Changelog / 更新日志

English | 简体中文

All notable changes to this project will be documented in this file.

本文件记录项目的重要变化。

## Unreleased

### English
- `retries` option (SDK) / CLI `--retries <n>`: opt into a restrained retry for transient failures only (429, 5xx, and network errors). A 429 honors `Retry-After` (seconds or an HTTP date, capped at 30s); everything else uses a short linear backoff. Default 0, so behavior is unchanged unless opted in — a defense against a single blip, not a way to grind past rate limiting.
- Added `FetchHttpError` (exported) carrying `status`, `url`, and `bodySnippet`; the HTTP layer now throws it on a non-2xx response. The `message` keeps the historical `HTTP <status> for <url>: <snippet>` shape.
- CLI `--with-news <n>` (trending command, json format): resolve news articles for the first n items (1-10) into a `news` field via `fetchTrendingNews`.
- CLI `--include-raw` and `--with-news` now fail fast (exit 2) when combined with a non-json format instead of silently dropping data.
- Completed the bundled `index.d.ts` (added `buildTrendingNewsRequest`, `newsArticlesFromPayload`, `FetchHttpError`, and the `retries` option) and added an export-drift guard test.
- Added an ESLint flat config (`npm run lint`) and a CI lint job.
- `fetchTrendingNow({ includeRaw: true })` / CLI `--include-raw`: attach the parsed batchexecute payload (pre-normalization) as `raw` on the envelope. Google-path only; fallback/failure envelopes carry `raw: null`. Default output is unchanged (guarded by a key-set regression test).
- `limit: "all"` (SDK) / `--limit all` (CLI): disable row-pool truncation and expose the full Trending Now pool (observed ~2000+ rows on a 168h/US window vs the default cap of 100).
- `fetchTrendingNews(refs)`: resolve the news-article references carried on each trending row (new `items[].news_refs`, from the w4opAf batch RPC) into `{ title, url, source, published_at, thumbnail_url }`. Google-path only. Items (both paths) now include a `news_refs` array — an additive schema change.

### 简体中文
- `retries` 选项（SDK）/ CLI `--retries <n>`：开启克制的重试，只覆盖瞬时失败（429、5xx、网络错误）。429 会尊重 `Retry-After`（秒数或 HTTP 日期，封顶 30 秒），其余用短线性退避。默认 0，不开启则行为不变——用于抵抗单次抖动，而不是绕过限流。
- 新增导出 `FetchHttpError`，带 `status`、`url`、`bodySnippet` 字段；HTTP 层在非 2xx 响应时抛出它。`message` 保持既有的 `HTTP <status> for <url>: <snippet>` 格式。
- CLI `--with-news <n>`（trending 命令 + json 格式）：通过 `fetchTrendingNews` 为前 n 条结果（1-10）解析新闻文章并写入 `news` 字段。
- CLI `--include-raw` 和 `--with-news` 与非 json 格式组合时改为快速失败（退出码 2），而不是静默丢弃数据。
- 补齐随包 `index.d.ts`（新增 `buildTrendingNewsRequest`、`newsArticlesFromPayload`、`FetchHttpError` 及 `retries` 选项），并新增导出漂移守卫测试。
- 新增 ESLint flat config（`npm run lint`）和 CI lint job。
- `fetchTrendingNow({ includeRaw: true })` / CLI `--include-raw`：在信封上附加 normalize 前的原始 batchexecute payload（`raw` 字段）。仅 Google 主路径提供；降级/失败信封为 `raw: null`。默认输出不变（键集回归测试钉住）。
- `limit: "all"`（SDK）/ `--limit all`（CLI）：关闭行池截断，暴露完整 Trending Now 池（168h/US 实测约 2000+ 行，默认上限 100）。
- `fetchTrendingNews(refs)`：把 trending 行携带的新闻引用（新增 `items[].news_refs`，来自 w4opAf 批量 RPC）解析为 `{ title, url, source, published_at, thumbnail_url }`。仅 Google 主路径。两条路径的 items 均新增 `news_refs` 数组——加法式 schema 变更。

## 1.0.0 - 2026-07-06

### English

- Added the `google-trends-now` CLI.
- Added the Node.js ESM SDK.
- Added Trending Now `batchexecute` fetching and parsing.
- Added RSS fallback marked as `rss_limited`.
- Added JSON, NDJSON, CSV, and Markdown formatters.
- Added local category filtering against returned `categories[]`.
- Added fail-fast validation for unknown non-numeric categories.
- Added explicit `category_filter_status` and `status_filter_status` markers when RSS cannot apply those filters.
- Added a shared option normalizer so the SDK validates and defaults identically to the CLI (upper-cased `geo`, `timeout_ms`/`fetch` aliases, allowed-list validation).
- Added fail-fast rejection of unknown/misspelled CLI flags.
- Made the `batchexecute` parser tolerate length-prefixed (chunked) responses.
- Neutralized CSV formula injection and fixed double-decoding of chained XML entities.
- Mapped Trending Now windows to valid Google Trends Explore date tokens.
- Made `healthcheck` probe the primary endpoint only (no RSS masking).
- Added parser, formatter, filtering, RSS, HTTP, options, normalize, and CLI tests.
- Added a lightweight Codex/Claude skill adapter.
- Added a GitHub Actions CI workflow (Node 22 and 24).
- Chose the MIT License.

### 简体中文

- 新增 `google-trends-now` 命令行工具。
- 新增 Node.js ESM SDK。
- 新增 Trending Now `batchexecute` 请求和解析。
- 新增标记为 `rss_limited` 的 RSS 兜底。
- 新增 JSON、NDJSON、CSV 和 Markdown 输出格式。
- 新增基于返回 `categories[]` 的本地分类过滤。
- 新增未知非数字分类的快速失败校验。
- 新增 RSS 无法应用分类或状态过滤时的 `category_filter_status` 和 `status_filter_status` 标记。
- 新增共享的选项归一化，使 SDK 与 CLI 的默认值和校验完全一致（`geo` 大写、`timeout_ms`/`fetch` 别名、白名单校验）。
- 新增对未知/拼错 CLI 参数的快速失败。
- `batchexecute` 解析器兼容带长度前缀（分块）的响应。
- 修复 CSV 公式注入，修复链式 XML 实体的重复解码。
- 将 Trending Now 时间窗映射到合法的 Google Trends Explore date token。
- `healthcheck` 只探测主接口（RSS 兜底不再掩盖故障）。
- 新增解析、格式化、过滤、RSS、HTTP、options、normalize 和 CLI 测试。
- 新增轻量 Codex/Claude skill 适配。
- 新增 GitHub Actions CI（Node 22 和 24）。
- 选择 MIT License。
