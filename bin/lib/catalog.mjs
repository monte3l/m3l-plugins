// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Shared helpers for check-catalog.mjs and bump-pins.mjs. Zero dependencies;
// every network or parse failure throws, so callers fail closed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const CATALOG = new URL("../../.claude-plugin/marketplace.json", import.meta.url);

export function readCatalog() {
  return JSON.parse(readFileSync(CATALOG, "utf8"));
}

/** The git URL and `owner/repo` slug an entry's source points at. */
export function repoOf(source) {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(source.url ?? "");
  if (!m) throw new Error(`cannot read a GitHub owner/repo from "${source.url}"`);
  return { owner: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}.git` };
}

/** Where plugin.json sits inside the pinned repo. */
export function manifestPath(source) {
  const dir = source.source === "git-subdir" ? `${source.path.replace(/\/$/, "")}/` : "";
  return `${dir}.claude-plugin/plugin.json`;
}

/** Parses `git ls-remote --tags` output into a map of tag name -> { direct, peeled }. */
export function parseLsRemote(out) {
  const tags = new Map();
  for (const line of out.split("\n").filter(Boolean)) {
    const [sha, ref] = line.split("\t");
    const peeled = ref.endsWith("^{}");
    const name = ref.replace(/^refs\/tags\//, "").replace(/\^\{\}$/, "");
    const t = tags.get(name) ?? {};
    t[peeled ? "peeled" : "direct"] = sha;
    tags.set(name, t);
  }
  return tags;
}

function lsRemoteTags(url, ...patterns) {
  const out = execFileSync("git", ["ls-remote", "--tags", url, ...patterns], {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return parseLsRemote(out);
}

/**
 * The commit a tag resolves to: the peeled SHA for an annotated tag, the
 * direct SHA for a lightweight one. Returns null when `ref` is not a tag.
 */
export function resolveTag(url, ref) {
  const t = lsRemoteTags(url, `refs/tags/${ref}`, `refs/tags/${ref}^{}`).get(ref);
  return t ? (t.peeled ?? t.direct) : null;
}

/** Every tag matching a `tagPattern` glob, as `{ tag, version, sha }`, stable releases only, newest first. */
export function matchReleaseTags(tags, pattern) {
  const [head, tail] = pattern.split("*");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc(head)}(\\d+\\.\\d+\\.\\d+)${esc(tail ?? "")}$`);
  const found = [];
  for (const [tag, t] of tags) {
    const m = re.exec(tag);
    if (m) found.push({ tag, version: m[1], sha: t.peeled ?? t.direct });
  }
  return found.sort((a, b) => cmpSemver(b.version, a.version));
}

export function releaseTags(url, pattern) {
  return matchReleaseTags(lsRemoteTags(url, `refs/tags/${pattern.split("*")[0]}*`), pattern);
}

export function cmpSemver(a, b) {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

/**
 * The rules an entry must meet that need no network: returns one message per
 * broken rule, empty when the entry is fine.
 */
export function entryProblems(entry, readme) {
  const problems = [];
  const { source } = entry;
  if (!["url", "git-subdir"].includes(source?.source)) {
    return [`source must be url or git-subdir, got ${source?.source}`];
  }
  // The `github` source type and `owner/repo` shorthand make Claude Code clone
  // over SSH, which fails for anyone without a GitHub key, so require the full
  // HTTPS URL.
  if (!/^https:\/\/github\.com\//.test(source.url ?? "")) {
    problems.push("source url must be a full https://github.com/ URL, not owner/repo shorthand");
  }
  if ("version" in entry) problems.push("must not set version; plugin.json owns it");
  if (!/^[0-9a-f]{40}$/.test(source.sha ?? "")) problems.push("sha must be 40 lowercase hex characters");
  if (!source.ref) problems.push("ref (a release tag) is required");
  if (!/^https:\/\/[a-z0-9-]+\.monte3l\.com\/?$/.test(entry.homepage ?? "")) {
    problems.push("homepage must be https://<name>.monte3l.com");
  }
  if (!readme.includes(`| \`${entry.name}\` |`)) problems.push("no row in the README plugin table");
  return problems;
}

/**
 * check-catalog.mjs requires an entry's description to equal the pinned
 * plugin.json's, so a bump copies it. Returns whether it changed. An empty or
 * missing description is ignored: check-catalog fails on that, loudly, and
 * overwriting a good description with nothing would hide it.
 */
export function syncDescription(entry, manifest) {
  const next = manifest?.description;
  if (typeof next !== "string" || next === "" || next === entry.description) return false;
  entry.description = next;
  return true;
}

export async function fetchManifest(source) {
  const { owner, repo } = repoOf(source);
  const path = manifestPath(source);
  // The pin comes from the catalog, which is reviewed, but it ends up in a
  // URL, so refuse anything that is not a plain owner, repo, commit and path.
  const safe = [
    [owner, /^[A-Za-z0-9._-]+$/],
    [repo, /^[A-Za-z0-9._-]+$/],
    [source.sha, /^[0-9a-f]{40}$/],
    [path, /^(?:[A-Za-z0-9._@-]+\/)*\.claude-plugin\/plugin\.json$/],
  ];
  for (const [value, re] of safe) {
    if (!re.test(value ?? "") || String(value).includes("..")) {
      throw new Error(`refusing to fetch with unexpected value "${value}"`);
    }
  }
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${source.sha}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}
