import {
  DEFAULTS,
  GOOGLE_TRENDING_BATCH_URL,
  TRENDING_NOW_RPC_ID,
  sortKeys
} from "./constants.js";
import { categoryId } from "./categories.js";

export function buildTrendingNowRequest(options = {}) {
  const geo = options.geo ?? DEFAULTS.geo;
  const hl = options.hl ?? DEFAULTS.hl;
  const hours = Number(options.hours ?? DEFAULTS.hours);
  const category = categoryId(options.category ?? DEFAULTS.category);
  const sortKey = sortKeys[options.sort ?? DEFAULTS.sort] ?? sortKeys.relevance;
  const innerPayload = [null, null, geo, category, hl, hours, sortKey];
  const requestPayload = [[[
    TRENDING_NOW_RPC_ID,
    JSON.stringify(innerPayload, null, 0),
    null,
    "generic"
  ]]];

  const query = new URLSearchParams({
    rpcids: TRENDING_NOW_RPC_ID,
    "source-path": "/trending",
    hl
  });
  const body = new URLSearchParams({
    "f.req": JSON.stringify(requestPayload, null, 0)
  });

  return {
    url: `${GOOGLE_TRENDING_BATCH_URL}?${query}`,
    body
  };
}

function stripXssiPrefix(text) {
  const trimmed = String(text ?? "").trim();
  return trimmed.startsWith(")]}'") ? trimmed.slice(4) : trimmed;
}

/**
 * Extract every top-level JSON array from a string, tolerating the numeric
 * length-prefix lines that Google's batchexecute endpoint interleaves between
 * streamed chunks. String contents (including bracket characters and escapes)
 * are skipped so they never affect bracket depth.
 *
 * @param {string} text
 * @returns {string[]}
 */
function extractJsonArrays(text) {
  const arrays = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "[") {
      continue;
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    const start = index;
    for (; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }
      if (char === "\"") {
        inString = true;
      } else if (char === "[") {
        depth += 1;
      } else if (char === "]") {
        depth -= 1;
        if (depth === 0) {
          arrays.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return arrays;
}

export function parseBatchexecuteResponse(text, rpcId = TRENDING_NOW_RPC_ID) {
  const body = stripXssiPrefix(text);
  const chunks = extractJsonArrays(body);
  if (chunks.length === 0) {
    throw new Error("Google Trends batchexecute response did not contain JSON");
  }

  for (const chunk of chunks) {
    let payload;
    try {
      payload = JSON.parse(chunk);
    } catch {
      continue;
    }
    if (!Array.isArray(payload)) {
      continue;
    }
    const entry = payload.find((candidate) => (
      Array.isArray(candidate) &&
      candidate.length >= 3 &&
      candidate[0] === "wrb.fr" &&
      candidate[1] === rpcId
    ));
    if (entry) {
      return JSON.parse(entry[2]);
    }
  }

  throw new Error(`Google Trends batchexecute response did not include ${rpcId}`);
}

export function trendingRowsFromPayload(payload) {
  if (Array.isArray(payload) && Array.isArray(payload[1])) {
    return payload[1];
  }
  return [];
}
