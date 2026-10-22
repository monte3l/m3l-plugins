#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Usage: PAYLOAD_REPOSITORY=monte3l/<repo> bump-for-release.mjs
// Run by the `Pins` workflow when a plugin repository dispatches
// `release-published`. Checks that the repository is one the catalog lists,
// has bump-pins.mjs move only that repository's pins, adds the CHANGELOG line
// each bump needs, and prints GitHub Actions outputs (proceed, branch, title,
// slug). It commits and pushes nothing: the workflow opens the pull request,
// and a person merges it.
//
// The payload is a hint, never a value: the new ref and sha come from
// `git ls-remote` inside bump-pins.mjs, so a forged dispatch can at worst
// open a pull request for a release that really exists.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { readCatalog } from "./lib/catalog.mjs";
import { appendBumpLines, assertSafeBumps, diffBumps, validateDispatch } from "./lib/dispatch.mjs";

const CHANGELOG = new URL("../CHANGELOG.md", import.meta.url);
const BUMP_PINS = new URL("./bump-pins.mjs", import.meta.url).pathname;

const emit = (key, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};
const stop = (message) => {
  console.log(message);
  emit("proceed", "false");
  process.exit(0);
};

const before = readCatalog();
const checked = validateDispatch({ repository: process.env.PAYLOAD_REPOSITORY }, before.plugins);
if (!checked.ok) stop(`skip: ${checked.reason}`);

execFileSync(process.execPath, [BUMP_PINS, "--apply", "--only", checked.slug], { stdio: "inherit" });

const bumps = diffBumps(before, readCatalog());
if (!bumps.length) stop(`nothing to bump: every ${checked.slug} pin is already current`);
assertSafeBumps(bumps);

writeFileSync(CHANGELOG, appendBumpLines(readFileSync(CHANGELOG, "utf8"), bumps));

const names = bumps.map((b) => b.name).join(", ");
const tags = bumps.map((b) => b.to).join(", ");
emit("proceed", "true");
emit("slug", checked.slug);
emit("branch", `bump-pins/${bumps.map((b) => b.name).join("+")}-${bumps[0].sha.slice(0, 7)}`);
emit("title", `chore(pins): move ${names} to ${tags}`);
console.log(`moved ${names} to ${tags}`);
