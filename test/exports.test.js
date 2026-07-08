import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as pkg from "../src/index.js";

// Drift guard: every value the package exports at runtime must also carry a
// matching `export (function|const|class) <name>` declaration in index.d.ts, so
// the hand-written types cannot silently fall behind the implementation.
test("every runtime export has a declaration in index.d.ts", async () => {
  const dts = await readFile(new URL("../src/index.d.ts", import.meta.url), "utf8");
  const names = Object.keys(pkg);
  assert.ok(names.length > 0, "expected the package to export something");

  for (const name of names) {
    const pattern = new RegExp(`export (?:function|const|class) ${name}\\b`, "u");
    assert.ok(pattern.test(dts), `index.d.ts is missing a declaration for "${name}"`);
  }
});
