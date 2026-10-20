#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Fails closed unless every marketplace entry is pinned to a monte3l release
// tag whose commit matches, agrees with the plugin's own manifest, and is
// documented in the README. `claude plugin validate` never fetches remote
// sources, so this is the check that catches a wrong or moved pin.
import { existsSync, readFileSync } from "node:fs";
import { fetchManifest, readCatalog, repoOf, resolveTag } from "./lib/catalog.mjs";

const readme = existsSync(new URL("../README.md", import.meta.url))
  ? readFileSync(new URL("../README.md", import.meta.url), "utf8")
  : "";
const problems = [];
const seen = new Set();

for (const entry of readCatalog().plugins) {
  const bad = (msg) => problems.push(`${entry.name}: ${msg}`);
  const { source } = entry;

  if (seen.has(entry.name)) bad("duplicate name");
  seen.add(entry.name);
  if (!["url", "git-subdir"].includes(source?.source)) {
    bad(`source must be url or git-subdir, got ${source?.source}`);
    continue;
  }
  // The `github` source type and `owner/repo` shorthand make Claude Code clone
  // over SSH, which fails for anyone without a GitHub key, so require the full
  // HTTPS URL.
  if (!/^https:\/\/github\.com\//.test(source.url ?? "")) {
    bad("source url must be a full https://github.com/ URL, not owner/repo shorthand");
  }
  if ("version" in entry) bad("must not set version; plugin.json owns it");
  if (!/^[0-9a-f]{40}$/.test(source.sha ?? "")) bad("sha must be 40 lowercase hex characters");
  if (!source.ref) bad("ref (a release tag) is required");
  if (!/^https:\/\/[a-z0-9-]+\.monte3l\.com\/?$/.test(entry.homepage ?? "")) {
    bad("homepage must be https://<name>.monte3l.com");
  }
  if (!readme.includes(`| \`${entry.name}\` |`)) bad("no row in the README plugin table");

  try {
    const { owner, url } = repoOf(source);
    if (owner !== "monte3l") bad(`repo owner is ${owner}, not monte3l`);
    const tagSha = resolveTag(url, source.ref);
    if (!tagSha) bad(`ref ${source.ref} is not a tag in ${url}`);
    else if (tagSha !== source.sha) bad(`ref ${source.ref} is ${tagSha}, pinned sha is ${source.sha}`);

    const manifest = await fetchManifest(source);
    if (manifest.name !== entry.name) bad(`plugin.json name is ${manifest.name}`);
    if (!manifest.version) bad("plugin.json has no version");
    if (manifest.description !== entry.description) bad("description differs from plugin.json");
  } catch (err) {
    bad(`could not verify the pin: ${err.message}`);
  }
}

if (problems.length) {
  console.error(problems.map((p) => `DRIFT  ${p}`).join("\n"));
  process.exit(1);
}
console.log(`OK     ${seen.size} plugin(s) pinned and consistent`);
