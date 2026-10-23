// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

import { test } from "node:test";
import assert from "node:assert/strict";

import { outgoingCommits, parseGitPush, signingEnabled, unsignedCommits } from "../bin/lib/signed-range.mjs";

/** A fake `runGit` that answers by joined args and throws for any unknown call. */
const fakeGit = (answers) => (args) => {
  const key = args.join(" ");
  if (!(key in answers)) throw new Error(`unexpected git ${key}`);
  const a = answers[key];
  if (a instanceof Error) throw a;
  return a;
};

test("parseGitPush recognises a push, a dry run and a non-push", () => {
  assert.deepEqual(parseGitPush("git push origin main"), { isPush: true, dryRun: false });
  assert.deepEqual(parseGitPush("git push --dry-run"), { isPush: true, dryRun: true });
  assert.deepEqual(parseGitPush("git push -n origin x"), { isPush: true, dryRun: true });
  assert.deepEqual(parseGitPush("git status"), { isPush: false, dryRun: false });
  assert.deepEqual(parseGitPush("echo hi"), { isPush: false, dryRun: false });
});

test("parseGitPush skips git global options and finds a push in a chain", () => {
  assert.equal(parseGitPush("git -c user.name=x -C /tmp push").isPush, true);
  assert.equal(parseGitPush("git --no-pager push").isPush, true);
  assert.equal(parseGitPush("npm test && /usr/bin/git push origin b").isPush, true);
  assert.equal(parseGitPush("git log; git push").isPush, true);
});

test("parseGitPush treats a non-string command as not a push", () => {
  assert.deepEqual(parseGitPush(undefined), { isPush: false, dryRun: false });
  assert.deepEqual(parseGitPush(42), { isPush: false, dryRun: false });
});

test("outgoingCommits excludes every remote ref that resolves", () => {
  const run = fakeGit({
    "rev-parse --verify --quiet @{upstream}": "",
    "rev-parse --verify --quiet origin/main": "",
    "rev-list HEAD --not @{upstream} origin/main": "c2\nc1\n",
  });
  assert.deepEqual(outgoingCommits(run), ["c2", "c1"]);
});

test("outgoingCommits uses local main only when no remote ref resolves", () => {
  const run = fakeGit({
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": new Error("none"),
    "rev-parse --verify --quiet main": "",
    "rev-list HEAD --not main": "c1\n",
  });
  assert.deepEqual(outgoingCommits(run), ["c1"]);
});

test("outgoingCommits falls back to HEAD, and to nothing when git fails", () => {
  const none = {
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": new Error("none"),
    "rev-parse --verify --quiet main": new Error("none"),
  };
  assert.deepEqual(outgoingCommits(fakeGit({ ...none, "rev-parse HEAD": "abc\n" })), ["abc"]);
  assert.deepEqual(outgoingCommits(fakeGit({ ...none, "rev-parse HEAD": new Error("x") })), []);
  const rev = { ...none, "rev-parse --verify --quiet main": "", "rev-list HEAD --not main": new Error("x") };
  assert.deepEqual(outgoingCommits(fakeGit(rev)), []);
});

test("unsignedCommits accepts G and U and reports everything else", () => {
  const show = (sha) => `show --no-patch --format=%G? ${sha}`;
  const run = fakeGit({
    [show("g")]: "G\n",
    [show("u")]: "U\n",
    [show("n")]: "N\n",
    [show("b")]: "B\n",
    [show("x")]: new Error("unreadable"),
  });
  assert.deepEqual(unsignedCommits(["g", "u", "n", "b", "x"], run), [
    { sha: "n", code: "N" },
    { sha: "b", code: "B" },
    { sha: "x", code: "E" },
  ]);
  assert.deepEqual(unsignedCommits([], run), []);
});

test("signingEnabled is true only when commit.gpgsign is true", () => {
  assert.equal(signingEnabled(fakeGit({ "config --get commit.gpgsign": "true\n" })), true);
  assert.equal(signingEnabled(fakeGit({ "config --get commit.gpgsign": "false\n" })), false);
  assert.equal(signingEnabled(fakeGit({ "config --get commit.gpgsign": new Error("unset") })), false);
});
