# Changelog / 更新日志

English | 简体中文

All notable changes to this project will be documented in this file.

本文件记录项目的重要变化。

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
