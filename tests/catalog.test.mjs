// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  checkCatalog,
  cmpSemver,
  entryProblems,
  fetchManifest,
  manifestPath,
  matchReleaseTags,
  parseBumpArgs,
  parseLsRemote,
  readCatalog,
  repoOf,
} from "../bin/lib/catalog.mjs";

const SHA = "a".repeat(40);
const README = "| `demo` | Does a thing. |";
const entry = (over = {}, source = {}) => ({
  name: "demo",
  homepage: "https://demo.monte3l.com",
  source: { source: "url", url: "https://github.com/monte3l/demo.git", ref: "demo--v1.0.0", sha: SHA, ...source },
  ...over,
});

test("a well-formed entry has no problems", () => {
  assert.deepEqual(entryProblems(entry(), README), []);
  assert.deepEqual(entryProblems(entry({}, { source: "git-subdir", path: "p" }), README), []);
});

test("entryProblems names each broken rule", () => {
  const cases = [
    [entry({}, { source: "github" }), /must be url or git-subdir/],
    [entry({}, { url: "monte3l/demo" }), /full https:\/\/github\.com\//],
    [entry({ version: "1.0.0" }), /must not set version/],
    [entry({}, { sha: "ABC" }), /40 lowercase hex/],
    [entry({}, { sha: "A".repeat(40) }), /40 lowercase hex/],
    [entry({}, { ref: "" }), /ref .* is required/],
    [entry({ homepage: "https://example.com" }), /homepage must be/],
    [entry({ name: "other" }), /no row in the README/],
  ];
  for (const [e, re] of cases) {
    assert.ok(entryProblems(e, README).some((m) => re.test(m)), String(re));
  }
});

test("repoOf reads owner and repo from a full URL and refuses anything else", () => {
  const want = { owner: "monte3l", repo: "demo", url: "https://github.com/monte3l/demo.git" };
  for (const url of ["https://github.com/monte3l/demo.git", "https://github.com/monte3l/demo", "https://github.com/monte3l/demo/"]) {
    assert.deepEqual(repoOf({ url }), want);
  }
  assert.throws(() => repoOf({ url: "monte3l/demo" }));
  assert.throws(() => repoOf({ url: "git@github.com:monte3l/demo.git" }));
  assert.throws(() => repoOf({}));
});

test("manifestPath follows the source type", () => {
  assert.equal(manifestPath({ source: "url" }), ".claude-plugin/plugin.json");
  assert.equal(manifestPath({ source: "git-subdir", path: "packages/plugin" }), "packages/plugin/.claude-plugin/plugin.json");
  assert.equal(manifestPath({ source: "git-subdir", path: "packages/plugin/" }), "packages/plugin/.claude-plugin/plugin.json");
});

test("parseLsRemote keeps the direct and the peeled SHA apart", () => {
  const out = [`${"1".repeat(40)}\trefs/tags/a--v1.0.0`, `${"2".repeat(40)}\trefs/tags/a--v1.0.0^{}`, `${"3".repeat(40)}\trefs/tags/a--v1.1.0`, ""].join("\n");
  const tags = parseLsRemote(out);
  assert.deepEqual(tags.get("a--v1.0.0"), { direct: "1".repeat(40), peeled: "2".repeat(40) });
  assert.deepEqual(tags.get("a--v1.1.0"), { direct: "3".repeat(40) });
  assert.equal(parseLsRemote("").size, 0);
});

test("matchReleaseTags sorts newest first, prefers the peeled SHA and drops pre-releases", () => {
  const tags = new Map([
    ["a--v1.9.0", { direct: "1" }],
    ["a--v1.10.0", { direct: "2", peeled: "3" }],
    ["a--v2.0.0-rc.1", { direct: "4" }],
    ["b--v9.0.0", { direct: "5" }],
  ]);
  assert.deepEqual(matchReleaseTags(tags, "a--v*"), [
    { tag: "a--v1.10.0", version: "1.10.0", sha: "3" },
    { tag: "a--v1.9.0", version: "1.9.0", sha: "1" },
  ]);
});

test("matchReleaseTags handles scoped-package patterns with regex characters", () => {
  const tags = new Map([["@monte3l/groundwork@1.0.5", { direct: "1" }], ["@monte3l/groundworkX1.0.5", { direct: "2" }]]);
  assert.deepEqual(matchReleaseTags(tags, "@monte3l/groundwork@*").map((t) => t.tag), ["@monte3l/groundwork@1.0.5"]);
});

test("cmpSemver compares numerically, not as strings", () => {
  assert.ok(cmpSemver("1.10.0", "1.9.0") > 0);
  assert.ok(cmpSemver("1.0.0", "1.0.1") < 0);
  assert.equal(cmpSemver("2.3.4", "2.3.4"), 0);
});

test("fetchManifest refuses unexpected values before any request", async () => {
  const base = { source: "url", url: "https://github.com/monte3l/demo.git", sha: SHA };
  await assert.rejects(fetchManifest({ ...base, sha: "main" }), /refusing/);
  await assert.rejects(fetchManifest({ ...base, source: "git-subdir", path: "../x" }), /refusing/);
  await assert.rejects(fetchManifest({ ...base, source: "git-subdir", path: "a b" }), /refusing/);
});

test("the real catalog passes the offline rules", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const e of readCatalog().plugins) assert.deepEqual(entryProblems(e, readme), [], e.name);
});

const LS = (sha, ref) => `${sha}\t${ref}`;

test("parseLsRemote skips lines that are not `<sha>\\t<ref>`", () => {
  const out = [LS(SHA, "refs/tags/v1"), "garbage", `${SHA}`, LS("short", "refs/tags/v2"), ""].join("\n");
  assert.deepEqual([...parseLsRemote(out).keys()], ["v1"]);
});

test("parseLsRemote pairs an annotated tag with its peeled commit", () => {
  const peeled = "b".repeat(40);
  const tags = parseLsRemote([LS(SHA, "refs/tags/v1"), LS(peeled, "refs/tags/v1^{}")].join("\n"));
  assert.deepEqual(tags.get("v1"), { direct: SHA, peeled });
});

const PIN = { ref: "demo--v1.0.0", sha: SHA };
const good = (e = entry()) => ({ resolve: () => SHA, manifestOf: async () => ({ name: e.name, version: "1.0.0", description: e.description }) });

test("checkCatalog passes a consistent catalog", async () => {
  const e = entry({ description: "d" });
  assert.deepEqual(await checkCatalog([e], README, good(e)), { problems: [], checked: 1 });
});

test("checkCatalog reports a tag that is missing or moved", async () => {
  const e = entry({ description: "d" });
  const missing = await checkCatalog([e], README, { ...good(e), resolve: () => null });
  assert.match(missing.problems[0], /is not a tag/);
  const moved = await checkCatalog([e], README, { ...good(e), resolve: () => "c".repeat(40) });
  assert.match(moved.problems[0], new RegExp(`${PIN.ref} is c{40}, pinned sha is a{40}`));
});

test("checkCatalog reports a manifest that disagrees with the entry", async () => {
  const e = entry({ description: "d" });
  const r = await checkCatalog([e], README, { ...good(e), manifestOf: async () => ({ name: "other", description: "x" }) });
  assert.deepEqual(r.problems.map((p) => p.replace(/^demo: /, "")), [
    "plugin.json name is other",
    "plugin.json has no version",
    "description differs from plugin.json",
  ]);
});

test("checkCatalog fails closed when a lookup throws", async () => {
  const e = entry({ description: "d" });
  const r = await checkCatalog([e], README, { ...good(e), resolve: () => { throw new Error("offline"); } });
  assert.deepEqual(r.problems, ["demo: could not verify the pin: offline"]);
});

test("checkCatalog reports a duplicate name and a foreign owner", async () => {
  const e = entry({ description: "d" }, { url: "https://github.com/someone/demo.git" });
  const r = await checkCatalog([e, e], README, good(e));
  assert.ok(r.problems.includes("demo: duplicate name"));
  assert.ok(r.problems.includes("demo: repo owner is someone, not monte3l"));
});

test("checkCatalog does not hit the network for an unsupported source", async () => {
  const e = entry({}, { source: "github" });
  const never = () => { throw new Error("should not be called"); };
  const r = await checkCatalog([e], README, { resolve: never, manifestOf: never });
  assert.deepEqual(r.problems, ["demo: source must be url or git-subdir, got github"]);
});

test("parseBumpArgs defaults to --check and accepts --apply and --only", () => {
  assert.deepEqual(parseBumpArgs([]), { mode: "--check", only: undefined });
  assert.deepEqual(parseBumpArgs(["--apply"]), { mode: "--apply", only: undefined });
  assert.deepEqual(parseBumpArgs(["--only", "monte3l/m3l-x", "--apply"]), { mode: "--apply", only: "monte3l/m3l-x" });
  assert.deepEqual(parseBumpArgs(["--check", "--only", "a/b"]), { mode: "--check", only: "a/b" });
});

test("parseBumpArgs rejects an unknown mode, extra arguments and a bad --only", () => {
  for (const argv of [["--bogus"], ["--check", "--apply"], ["--only"], ["--only", "nope"], ["--only", "a/b/c"]]) {
    assert.match(parseBumpArgs(argv).error, /^usage:/, argv.join(" "));
  }
});

test("repoOf rejects a url that is not a GitHub repository", () => {
  assert.throws(() => repoOf({ url: "git@github.com:monte3l/x.git" }), /cannot read/);
  assert.throws(() => repoOf({}), /cannot read/);
});

test("manifestPath puts a git-subdir plugin's manifest under its path", () => {
  assert.equal(manifestPath({ source: "git-subdir", path: "packages/x/" }), "packages/x/.claude-plugin/plugin.json");
});

test("fetchManifest refuses an unsafe value before any request", async () => {
  const src = { source: "url", url: "https://github.com/monte3l/x.git", sha: "nothex" };
  await assert.rejects(() => fetchManifest(src), /refusing to fetch/);
  await assert.rejects(() => fetchManifest({ ...src, sha: SHA, url: "https://github.com/mon..te3l/x.git" }), /refusing to fetch/);
});
