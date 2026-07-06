---
name: google-trends-now
description: Use when a task needs Google Trends Trending Now hot-word discovery through the google-trends-now CLI, including trending queries, RSS fallback, category lists, or health checks. Do not use for fixed keyword curve validation.
---

# google-trends-now

Use this skill for Google Trends **Trending Now** hot-word discovery. Call the `google-trends-now` CLI — do not reimplement scraping in the agent.

```bash
google-trends-now trending --geo US --hours 48 --limit 100 --format json
google-trends-now trending --category technology --status active --format markdown
google-trends-now rss --geo US --format json
google-trends-now categories
google-trends-now healthcheck
```

Guidance:

- Use `trending` to discover hot words, emerging topics, and market/content signals from the Trending Now pool.
- Do not use it to validate fixed keyword curves — for known keywords use Google Trends Explore or a separate keyword-watch flow.
- `fetch_status: "rss_limited"` means the RSS fallback was used: it is not the complete pool, and category/status fields may be missing. `unavailable_in_rss` on `category_filter_status`/`status_filter_status` means the rows were kept because RSS cannot apply that filter.
- Search volume is an approximate interest signal, not sales, exact demand, or market size.
- Trending rank is discovery order, not opportunity rank — apply your own business, competition, seasonality, and fit analysis.
