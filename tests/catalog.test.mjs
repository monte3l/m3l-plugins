// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  cmpSemver,
  entryProblems,
  fetchManifest,
  manifestPath,
  matchReleaseTags,
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
