#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Usage: bump-pins.mjs [--check | --apply] [--only owner/repo]
// --check (default) prints OK or STALE per plugin and exits 1 on any STALE.
// --apply rewrites ref and sha to the newest stable release tag, and the
// description to match plugin.json at that tag. Review the diff, then open the
// PR; nothing here commits or pushes.
// --only owner/repo leaves every plugin that points at another repository
// alone, so a release of one plugin cannot move the pin of another.
import { writeFileSync } from "node:fs";
import { CATALOG, fetchManifest, readCatalog, releaseTags, repoOf, syncDescription } from "./lib/catalog.mjs";

const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only = onlyAt === -1 ? undefined : args[onlyAt + 1];
const rest = args.filter((_, i) => i !== onlyAt && i !== onlyAt + 1 || onlyAt === -1);
const mode = rest[0] ?? "--check";
if (!["--check", "--apply"].includes(mode) || rest.length > 1 || (onlyAt !== -1 && !/^[\w.-]+\/[\w.-]+$/.test(only ?? ""))) {
  console.error("usage: bump-pins.mjs [--check | --apply] [--only owner/repo]");
  process.exit(2);
}

const catalog = readCatalog();
let stale = 0;
for (const entry of catalog.plugins) {
  if (only) {
    const { owner, repo } = repoOf(entry.source);
    if (`${owner}/${repo}` !== only) continue;
  }
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
  if (mode === "--apply") {
    Object.assign(entry.source, { ref: latest.tag, sha: latest.sha });
    // check-catalog fails unless the description equals plugin.json's at the pin.
    if (syncDescription(entry, await fetchManifest(entry.source))) {
      console.log(`DESCRIPTION ${entry.name}: now matches plugin.json at ${latest.tag}`);
    }
  }
}

if (mode === "--apply" && stale) {
  writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`wrote ${stale} bump(s); review with git diff, then run check-catalog.mjs`);
} else if (stale) {
  process.exit(1);
}
