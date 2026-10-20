#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Usage: bump-pins.mjs [--check | --apply]
// --check (default) prints OK or STALE per plugin and exits 1 on any STALE.
// --apply rewrites ref and sha to the newest stable release tag. Review the
// diff, then open the PR; nothing here commits or pushes.
import { writeFileSync } from "node:fs";
import { CATALOG, readCatalog, releaseTags, repoOf } from "./lib/catalog.mjs";

const mode = process.argv[2] ?? "--check";
if (!["--check", "--apply"].includes(mode)) {
  console.error("usage: bump-pins.mjs [--check | --apply]");
  process.exit(2);
}

const catalog = readCatalog();
let stale = 0;
for (const entry of catalog.plugins) {
  const pattern = entry.metadata?.m3l?.tagPattern;
  if (!pattern) {
    console.error(`DRIFT  ${entry.name}: no metadata.m3l.tagPattern`);
    process.exit(1);
  }
  const [latest] = releaseTags(repoOf(entry.source).url, pattern);
  if (!latest) {
    console.error(`DRIFT  ${entry.name}: no release tag matches ${pattern}`);
    process.exit(1);
  }
  if (latest.tag === entry.source.ref && latest.sha === entry.source.sha) {
    console.log(`OK     ${entry.name} ${entry.source.ref}`);
    continue;
  }
  stale++;
  console.log(`STALE  ${entry.name}: ${entry.source.ref} -> ${latest.tag}`);
  if (mode === "--apply") Object.assign(entry.source, { ref: latest.tag, sha: latest.sha });
}

if (mode === "--apply" && stale) {
  writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`wrote ${stale} bump(s); review with git diff, then run check-catalog.mjs`);
} else if (stale) {
  process.exit(1);
}
