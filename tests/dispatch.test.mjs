// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { syncDescription } from "../bin/lib/catalog.mjs";
import { appendBumpLines, assertSafeBumps, diffBumps, validateDispatch } from "../bin/lib/dispatch.mjs";

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);
const plugin = (name, repo, ref = `${name}--v1.0.0`, sha = SHA) => ({
  name,
  source: { source: "url", url: `https://github.com/monte3l/${repo}.git`, ref, sha },
});
const plugins = [plugin("one", "repo-one"), plugin("two", "repo-two")];

test("a listed monte3l repository is accepted, with the plugins it lists", () => {
  assert.deepEqual(validateDispatch({ repository: "monte3l/repo-one" }, plugins), {
    ok: true,
    slug: "monte3l/repo-one",
    plugins: ["one"],
  });
});

test("a repository the catalog does not list is refused", () => {
  assert.equal(validateDispatch({ repository: "monte3l/unlisted" }, plugins).ok, false);
});

test("another owner, a missing or non-string repository and odd characters are refused", () => {
  for (const repository of ["evil/repo-one", undefined, 7, "monte3l/repo-one; rm -rf /", "monte3l/", "monte3l/a/b"]) {
    assert.equal(validateDispatch({ repository }, plugins).ok, false, String(repository));
  }
  assert.equal(validateDispatch(null, plugins).ok, false);
});

test("an object repository whose toString is not callable is refused, not thrown on", () => {
  for (const repository of [{ toString: 0 }, Object.create(null), [{ toString: 0 }]]) {
    const r = validateDispatch({ repository }, plugins);
    assert.equal(r.ok, false);
    assert.match(r.reason, /is not a monte3l repository/);
  }
});

test("a refusal reason never carries control characters or a long payload", () => {
  const { reason } = validateDispatch({ repository: `::error::\n${"x".repeat(500)}` }, plugins);
  assert.ok(!/[\n\r]/.test(reason));
  assert.ok(reason.length < 130);
});

test("a source that is not a GitHub URL is skipped, not fatal", () => {
  const odd = [{ name: "odd", source: { source: "url", url: "not a url" } }, ...plugins];
  assert.equal(validateDispatch({ repository: "monte3l/repo-two" }, odd).ok, true);
});

test("diffBumps lists only the plugins whose ref or sha changed", () => {
  const after = {
    plugins: [plugin("one", "repo-one", "one--v1.1.0", OTHER), plugin("two", "repo-two")],
  };
  assert.deepEqual(diffBumps({ plugins }, after), [{ name: "one", from: "one--v1.0.0", to: "one--v1.1.0", sha: OTHER, description: false }]);
  assert.deepEqual(diffBumps({ plugins }, { plugins }), []);
});

test("diffBumps notices a moved sha under the same ref", () => {
  const after = { plugins: [plugin("one", "repo-one", "one--v1.0.0", OTHER), plugins[1]] };
  assert.equal(diffBumps({ plugins }, after).length, 1);
});

test("appendBumpLines adds one line per bump at the end of the Unreleased list", () => {
  const text = "# Changelog\n\nIntro.\n\n## Unreleased\n\n- First.\n";
  const out = appendBumpLines(text, [{ name: "one", to: "one--v1.1.0" }, { name: "two", to: "two--v2.0.0" }]);
  assert.equal(out, `${text}- Moved \`one\` to \`one--v1.1.0\`.\n- Moved \`two\` to \`two--v2.0.0\`.\n`);
});

test("appendBumpLines tolerates missing and extra trailing newlines, and needs an Unreleased section", () => {
  const bump = [{ name: "one", to: "one--v1.1.0" }];
  assert.ok(appendBumpLines("## Unreleased\n\n- A.", bump).endsWith("- A.\n- Moved `one` to `one--v1.1.0`.\n"));
  assert.ok(appendBumpLines("## Unreleased\n\n- A.\n\n\n", bump).endsWith("- A.\n- Moved `one` to `one--v1.1.0`.\n"));
  assert.throws(() => appendBumpLines("# Changelog\n", bump), /no Unreleased section/);
});

test("assertSafeBumps accepts the tag shapes the org uses and rejects anything else", () => {
  const ok = (name, to, sha = SHA) => ({ name, to, sha });
  assert.doesNotThrow(() => assertSafeBumps([ok("p", "p--v1.0.0"), ok("g", "@monte3l/groundwork@1.0.5")]));
  assert.throws(() => assertSafeBumps([ok("p", "p--v1\n::set-output")]), /unexpected characters/);
  assert.throws(() => assertSafeBumps([ok("p", "p v1")]), /unexpected characters/);
  assert.throws(() => assertSafeBumps([ok("p", "p--v1", "short")]), /40 hex/);
});

// bump-pins.mjs fails on a bad argument before it reads the catalog, and with
// --only on a repository no entry points at it selects nothing, so neither
// case touches the network.
const bumpPins = (...args) =>
  spawnSync(process.execPath, [new URL("../bin/bump-pins.mjs", import.meta.url).pathname, ...args], { encoding: "utf8" });

test("bump-pins refuses an unknown flag, a repeated mode and a malformed --only", () => {
  for (const args of [["--bogus"], ["--check", "--apply"], ["--only"], ["--only", "nope"], ["--apply", "--only", "a/b/c"]]) {
    const run = bumpPins(...args);
    assert.equal(run.status, 2, args.join(" "));
    assert.match(run.stderr, /usage: bump-pins/);
  }
});

test("bump-pins --only selects nothing, and changes nothing, for a repository the catalog does not point at", () => {
  for (const mode of ["--check", "--apply"]) {
    const run = bumpPins(mode, "--only", "monte3l/not-in-the-catalog");
    assert.equal(run.status, 0, mode);
    assert.equal(run.stdout, "");
  }
});

test("diffBumps says when the description moved with the pin", () => {
  const before = { plugins: [{ ...plugin("one", "repo-one"), description: "Old." }] };
  const after = { plugins: [{ ...plugin("one", "repo-one", "one--v1.1.0", OTHER), description: "New." }] };
  assert.equal(diffBumps(before, after)[0].description, true);
});

test("appendBumpLines notes a description that changed with the pin", () => {
  const out = appendBumpLines("## Unreleased\n\n- A.\n", [{ name: "one", to: "one--v1.1.0", description: true }]);
  assert.ok(out.endsWith("- Moved `one` to `one--v1.1.0`, and its description to match `plugin.json`.\n"));
});

test("syncDescription copies a changed description and reports it", () => {
  const entry = { name: "one", description: "Old." };
  assert.equal(syncDescription(entry, { description: "New." }), true);
  assert.equal(entry.description, "New.");
});

test("syncDescription leaves an equal, empty, missing or non-string description alone", () => {
  for (const manifest of [{ description: "Same." }, { description: "" }, {}, { description: 7 }, null, undefined]) {
    const entry = { name: "one", description: "Same." };
    assert.equal(syncDescription(entry, manifest), false);
    assert.equal(entry.description, "Same.");
  }
});
