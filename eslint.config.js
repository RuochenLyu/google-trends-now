import js from "@eslint/js";

// Lean flat config: the recommended ruleset plus two rules that match how this
// codebase already reads (no dead bindings, strict equality). No style plugins
// on purpose — formatting is left to review, not tooling.
export default [
  {
    ignores: ["node_modules/**"]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        globalThis: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "error",
      eqeqeq: "error"
    }
  }
];
