// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { outgoingCommits, parseGitPush, parseGitPushes, signingEnabled, unsignedCommits } from "../bin/lib/signed-range.mjs";

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

/** The tips of the only push in `command`, so a test reads as "this command vets these refs". */
const tipsOf = (command) => {
  const pushes = parseGitPushes(command);
  assert.equal(pushes.length, 1, `one push in: ${command}`);
  return pushes[0].tips;
};

test("parseGitPushes returns the refs a push sends: HEAD, a branch, the source of a refspec", () => {
  assert.deepEqual(parseGitPushes("git push"), [{ dryRun: false, tips: ["HEAD"], dirs: [""] }]);
  assert.deepEqual(tipsOf("git push origin topic"), ["topic"]);
  assert.deepEqual(tipsOf("git push origin +topic:refs/heads/x"), ["topic"]);
  assert.deepEqual(tipsOf("git push origin HEAD:refs/heads/x"), ["HEAD"]);
  assert.deepEqual(tipsOf("git push origin a b"), ["a", "b"]);
  assert.deepEqual(tipsOf("git push origin 'refs/heads/*:refs/heads/*'"), ["--branches"]);
});

test("parseGitPushes vets every branch for --all and --mirror, by name or by unique prefix", () => {
  assert.deepEqual(tipsOf("git push --all origin"), ["--branches"]);
  assert.deepEqual(tipsOf("git push --mirror origin"), ["--branches"]);
  assert.deepEqual(tipsOf("git push --mir origin"), ["--branches"]);
});

test("parseGitPushes sends nothing for a deletion, and a tag sent as a tag is not vetted", () => {
  assert.deepEqual(tipsOf("git push origin :old"), []);
  assert.deepEqual(tipsOf("git push --delete origin old"), []);
  assert.deepEqual(tipsOf("git push origin tag v1"), []);
  assert.deepEqual(tipsOf("git push origin refs/tags/v1"), []);
  assert.deepEqual(tipsOf("git push origin refs/tags/v1:refs/tags/v1"), []);
});

test("parseGitPushes vets a tag that is sent to a branch, or that names a commit", () => {
  assert.deepEqual(tipsOf("git push origin refs/tags/v1:refs/heads/y"), ["refs/tags/v1"]);
  assert.deepEqual(tipsOf("git push origin refs/tags/v1:main"), ["refs/tags/v1"]);
  assert.deepEqual(tipsOf("git push origin refs/tags/v1~1:refs/tags/x"), ["refs/tags/v1~1"]);
});

test("parseGitPushes treats an option it cannot place as a reason to vet every branch", () => {
  assert.deepEqual(tipsOf("git push --bogus origin topic"), ["topic", "--branches"]);
  assert.deepEqual(tipsOf("git push --d origin topic"), ["topic", "--branches"]); // ambiguous: dry-run or delete
  assert.deepEqual(tipsOf("git push -z origin topic"), ["topic", "--branches"]);
});

test("parseGitPushes reads dry runs, negations, and an option value that looks like a flag", () => {
  assert.equal(parseGitPushes("git push --dry origin x")[0].dryRun, true);
  assert.equal(parseGitPushes("git push --dry-run --no-dry-run origin x")[0].dryRun, false);
  // `-o -n` pushes the option string "-n": it is not a dry run.
  assert.equal(parseGitPushes("git push -o -n origin x")[0].dryRun, false);
  assert.deepEqual(tipsOf("git push --repo=origin topic"), ["topic"]);
  assert.deepEqual(tipsOf("git push -- origin topic"), ["topic"]);
});

test("parseGitPushes keeps every place a push may run: -C, and a cd that may have failed", () => {
  assert.deepEqual(parseGitPushes("git -C /elsewhere push origin x")[0].dirs, ["/elsewhere"]);
  assert.deepEqual(parseGitPushes("cd sub && git push origin x")[0].dirs, ["", "sub"]);
  assert.deepEqual(parseGitPushes("cd sub && git -C inner push origin x")[0].dirs, ["inner", path.join("sub", "inner")]);
  // A cd to somewhere it cannot follow (a variable, a glob) is ignored, not guessed.
  assert.deepEqual(parseGitPushes("cd $WORK && git push")[0].dirs, [""]);
});

test("parseGitPushes finds a push wrapped in a shell, a substitution or a prefix", () => {
  // A line with a shell, `git` and `push` also counts as a push of every branch, so there are two pushes here:
  // the precise one and the every-branch one.
  const wrapped = parseGitPushes("bash -c 'git push origin topic'");
  assert.ok(wrapped.some((push) => push.tips.includes("topic")));
  assert.ok(wrapped.some((push) => push.tips.includes("--branches")));
  assert.equal(tipsOf("echo $(git push origin topic)")[0], "topic");
  assert.equal(tipsOf("sudo git push origin topic")[0], "topic");
  assert.deepEqual(parseGitPushes("git status && git log"), []);
});

// The helper peels every tip (`HEAD^{commit}`), so an annotated tag names the commit it points at, and a
// tip that does not resolve is left out. The fake git answers the peeled form.
const HEAD_OK = { "rev-parse --verify --quiet HEAD^{commit}": "" };

test("outgoingCommits excludes every remote ref that resolves", () => {
  const run = fakeGit({
    ...HEAD_OK,
    "rev-parse --verify --quiet @{upstream}": "",
    "rev-parse --verify --quiet origin/main": "",
    "rev-list HEAD^{commit} --not @{upstream} origin/main": "c2\nc1\n",
  });
  assert.deepEqual(outgoingCommits(run), ["c2", "c1"]);
});

test("outgoingCommits uses local main only when no remote ref resolves", () => {
  const run = fakeGit({
    ...HEAD_OK,
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": new Error("none"),
    "rev-parse --verify --quiet main": "",
    "rev-list HEAD^{commit} --not main": "c1\n",
  });
  assert.deepEqual(outgoingCommits(run), ["c1"]);
});

test("outgoingCommits falls back to HEAD, and to nothing when git fails", () => {
  const none = {
    ...HEAD_OK,
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": new Error("none"),
    "rev-parse --verify --quiet main": new Error("none"),
  };
  assert.deepEqual(outgoingCommits(fakeGit({ ...none, "rev-parse HEAD^{commit}": "abc\n" })), ["abc"]);
  assert.deepEqual(outgoingCommits(fakeGit({ ...none, "rev-parse HEAD^{commit}": new Error("x") })), []);
  const rev = { ...none, "rev-parse --verify --quiet main": "", "rev-list HEAD^{commit} --not main": new Error("x") };
  assert.deepEqual(outgoingCommits(fakeGit(rev)), []);
});

test("outgoingCommits vets nothing for a tip that does not resolve or that is an option", () => {
  // No other git call is answered: a tip left out must not reach `rev-list` or `rev-parse`.
  assert.deepEqual(outgoingCommits(fakeGit({ "rev-parse --verify --quiet gone^{commit}": new Error("none") }), ["gone"]), []);
  assert.deepEqual(outgoingCommits(fakeGit({}), ["--force"]), []);
  assert.deepEqual(outgoingCommits(fakeGit({}), []), []);
});

test("outgoingCommits peels a named tip, and never excludes main when main is the tip", () => {
  const none = {
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": new Error("none"),
  };
  // `main` is the tip: excluding it would erase the commits being pushed, so it is not an exclusion.
  const run = fakeGit({ ...none, "rev-parse --verify --quiet main^{commit}": "", "rev-parse main^{commit}": "m1\n" });
  assert.deepEqual(outgoingCommits(run, ["main"]), ["m1"]);
  // A tag name is peeled to the commit it points at.
  const tag = fakeGit({
    "rev-parse --verify --quiet v1^{commit}": "",
    "rev-parse --verify --quiet @{upstream}": "",
    "rev-parse --verify --quiet origin/main": new Error("none"),
    "rev-list v1^{commit} --not @{upstream}": "t1\n",
  });
  assert.deepEqual(outgoingCommits(tag, ["v1"]), ["t1"]);
});

test("outgoingCommits lists every branch for --branches, and removes duplicates between tips", () => {
  const noRemote = {
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": new Error("none"),
    "rev-parse --verify --quiet main": new Error("none"),
  };
  const branches = fakeGit({ ...noRemote, "for-each-ref --format=%(objectname) refs/heads/": "a1\n\nb2\n" });
  assert.deepEqual(outgoingCommits(branches, ["--branches"]), ["a1", "b2"]);

  const withRemote = fakeGit({
    "rev-parse --verify --quiet @{upstream}": new Error("none"),
    "rev-parse --verify --quiet origin/main": "",
    "rev-list --branches --not origin/main": "n1\nn2\n",
  });
  assert.deepEqual(outgoingCommits(withRemote, ["--branches"]), ["n1", "n2"]);

  // Two tips that point at one commit report it once.
  const twice = fakeGit({
    ...noRemote,
    "rev-parse --verify --quiet HEAD^{commit}": "",
    "rev-parse --verify --quiet topic^{commit}": "",
    "rev-parse HEAD^{commit}": "same\n",
    "rev-parse topic^{commit}": "same\n",
  });
  assert.deepEqual(outgoingCommits(twice, ["HEAD", "topic"]), ["same"]);
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
