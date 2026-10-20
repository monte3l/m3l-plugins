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

function lsRemoteTags(url, ...patterns) {
  const out = execFileSync("git", ["ls-remote", "--tags", url, ...patterns], {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  const tags = new Map(); // tag name -> { direct, peeled }
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

/**
 * The commit a tag resolves to: the peeled SHA for an annotated tag, the
 * direct SHA for a lightweight one. Returns null when `ref` is not a tag.
 */
export function resolveTag(url, ref) {
  const t = lsRemoteTags(url, `refs/tags/${ref}`, `refs/tags/${ref}^{}`).get(ref);
  return t ? (t.peeled ?? t.direct) : null;
}

/** Every tag matching a `tagPattern` glob, as `{ tag, version, sha }`, stable releases only. */
export function releaseTags(url, pattern) {
  const [head, tail] = pattern.split("*");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc(head)}(\\d+\\.\\d+\\.\\d+)${esc(tail ?? "")}$`);
  const found = [];
  for (const [tag, t] of lsRemoteTags(url, `refs/tags/${head}*`)) {
    const m = re.exec(tag);
    if (m) found.push({ tag, version: m[1], sha: t.peeled ?? t.direct });
  }
  return found.sort((a, b) => cmpSemver(b.version, a.version));
}

export function cmpSemver(a, b) {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
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
