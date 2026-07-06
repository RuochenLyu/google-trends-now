# Contributing / 贡献指南

English | 简体中文

## English

Thanks for contributing to `google-trends-now`.

This project has a narrow scope: Trending Now only. Do not add Google Trends Explore curves, browser automation, login flows, proxy rotation, CAPTCHA handling, or anti-bot bypass code.

Requires Node.js >= 22 (built-in `fetch`, `AbortSignal.timeout`, `Array.prototype.toSorted`). There are no runtime dependencies, so no install step is needed to run the tests.

Before opening a pull request:

```bash
npm test
node bin/google-trends-now.mjs categories
npx . trending --geo US --hours 48 --limit 5 --format json
npm pack
```

Implementation rules:

- Keep runtime dependencies at zero unless there is a clear, reviewed reason.
- Keep Node.js ESM only.
- Use built-in `fetch`.
- Keep category filtering local against returned `categories[]`.
- Add tests for parser, formatter, CLI, and fallback behavior when changing those areas.
- Keep output fields backward compatible when possible.

Commit and pull request style:

- Use a focused title.
- Explain behavior changes and test results.
- Include fixtures for parser regressions.
- Do not claim official Google support.

## 简体中文

感谢你为 `google-trends-now` 做贡献。

本项目范围很窄：只做 Trending Now。不要加入 Google Trends Explore 曲线、浏览器自动化、登录流程、代理轮换、验证码处理或反反爬绕过代码。

需要 Node.js >= 22（内置 `fetch`、`AbortSignal.timeout`、`Array.prototype.toSorted`）。项目没有运行时依赖，跑测试无需安装步骤。

提交 pull request 前请运行：

```bash
npm test
node bin/google-trends-now.mjs categories
npx . trending --geo US --hours 48 --limit 5 --format json
npm pack
```

实现规则：

- 除非有明确且经过评审的理由，否则保持零运行时依赖。
- 保持 Node.js ESM only。
- 使用内置 `fetch`。
- 分类过滤必须基于返回结果里的 `categories[]` 在本地执行。
- 修改解析、格式化、CLI 或 fallback 行为时，需要补测试。
- 尽量保持输出字段向后兼容。

提交和 PR 风格：

- 标题聚焦。
- 说明行为变化和测试结果。
- 解析回归要附 fixture。
- 不要宣称 Google 官方支持。
