#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Fails closed unless every marketplace entry is pinned to a monte3l release
// tag whose commit matches, agrees with the plugin's own manifest, and is
// documented in the README. `claude plugin validate` never fetches remote
// sources, so this is the check that catches a wrong or moved pin.
import { existsSync, readFileSync } from "node:fs";
import { checkCatalog, readCatalog } from "./lib/catalog.mjs";

const readme = existsSync(new URL("../README.md", import.meta.url))
  ? readFileSync(new URL("../README.md", import.meta.url), "utf8")
  : "";
const { problems, checked } = await checkCatalog(readCatalog().plugins, readme);

if (problems.length) {
  console.error(problems.map((p) => `DRIFT  ${p}`).join("\n"));
  process.exit(1);
}
console.log(`OK     ${checked} plugin(s) pinned and consistent`);
