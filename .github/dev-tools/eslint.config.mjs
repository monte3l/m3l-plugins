// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// The coding standard for this repo's JavaScript: ESLint's recommended rules,
// with every warning an error, over what the project wrote. Run from the
// repository root by verify.yml's `lint` lane; the vendored design/source/ and
// installed packages are never linted.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["design/**", "**/node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
