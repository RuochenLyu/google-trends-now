import { DEFAULTS } from "./constants.js";
import { categoryId } from "./categories.js";

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function recencyValue(item) {
  if (Number.isFinite(Number(item.start_timestamp))) {
    return Number(item.start_timestamp);
  }
  if (item.started_at) {
    const timestamp = Date.parse(item.started_at);
    return Number.isFinite(timestamp) ? timestamp / 1000 : 0;
  }
  if (item.rss_pub_date) {
    const timestamp = Date.parse(item.rss_pub_date);
    return Number.isFinite(timestamp) ? timestamp / 1000 : 0;
  }
  return 0;
}

function hasCategory(item, targetCategoryId) {
  if (targetCategoryId === 0) {
    return true;
  }
  return (item.categories ?? []).some((category) => Number(category.id) === targetCategoryId);
}

export function applyFiltersAndSort(items, options = {}) {
  const targetCategoryId = categoryId(options.category ?? DEFAULTS.category);
  const status = options.status ?? DEFAULTS.status;
  const sort = options.sort ?? DEFAULTS.sort;
  const parsedLimit = Number.parseInt(options.limit ?? DEFAULTS.limit, 10);
  // A non-numeric limit must not silently truncate to zero items.
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : DEFAULTS.limit;

  let filtered = items.filter((item) => hasCategory(item, targetCategoryId));

  if (status === "active") {
    filtered = filtered.filter((item) => item.active === true);
  } else if (status === "ended") {
    filtered = filtered.filter((item) => item.active === false);
  }

  if (sort === "volume") {
    filtered = filtered.toSorted((a, b) => numericValue(b.search_volume) - numericValue(a.search_volume));
  } else if (sort === "recency") {
    filtered = filtered.toSorted((a, b) => recencyValue(b) - recencyValue(a));
  } else if (sort === "title") {
    filtered = filtered.toSorted((a, b) => String(a.query ?? "").localeCompare(String(b.query ?? "")));
  }

  return filtered.slice(0, limit).map((item, index) => ({
    ...item,
    raw_position: item.raw_position ?? item.position ?? index + 1,
    position: index + 1
  }));
}
