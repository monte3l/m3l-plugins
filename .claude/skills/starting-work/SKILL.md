---
name: starting-work
description: >-
  The pre-work decision gate for any task that will change code. Invoke it
  FIRST -- before reading, investigating, or editing anything -- for
  "implement", "build", "add", "fix the bug where ...", "refactor", or any
  request to change behavior, even when the change is unnamed or you have not
  seen the code yet. Inspects git state, recommends a branch (feat/fix <slug>)
  and push target, and decides whether a PR is required, all confirmed before
  any write. Skip for research and questions that change nothing.
allowed-tools: Bash(git status --porcelain) Bash(git rev-parse --abbrev-ref HEAD) Bash(git rev-parse --git-path hooks) Bash(node --version)
---

# starting-work

This skill is the single place the project answers "where do I do this
work?" before touching anything. This repo's rule (`.claude/CLAUDE.md`) is that
every change goes through a pull request from a `feat/`, `fix/`, `ci/`,
`chore/` or `docs/` branch, and the `main` ruleset enforces it on the server.
Nothing local stops a write on `main`, so this skill is the whole guard: it
branches _before_ the first edit.

## The contract

**Infer and recommend all decisions, then confirm every one with the user in
a single round. Do not write files or create a branch until the user has
confirmed.** The user is always free to override a recommendation; your job
is to make the right default obvious, not to force it.

## Steps

### 1 — Inspect git state (read-only)

```bash
git rev-parse --abbrev-ref HEAD      # branch name; "HEAD" means detached
git status --porcelain               # is the tree already dirty?
```

- A detached HEAD sitting on the `main` commit is treated as `main` for
  isolation purposes — it's the same tree state the guard protects.
- **Re-run this inspection after any conversational gap, not just at the
  start.** The branch is not a stable fact across a long session.

### 1a — Environment preflight (read-only)

Before recommending anything, check that the checkout can actually run the
project's gates. This only reads and will report findings: **never install** anything and
never change a file, since a missing piece is the owner's call.

- **Node.** Compare `node --version` with the major in `.node-version` (the
  project's authority for it). A mismatch is a finding, not an error.
- **Dependencies.** None are needed for the repo's own checks (`node:test`,
  no packages). Only `claude plugin validate` and `bin/smoke-install.sh` need
  the `claude` CLI on `PATH`; report it if `claude` is missing.
- **Commit signing.** `git config commit.gpgsign` should be `true`, since the
  `main` ruleset rejects unsigned commits. Commits also need `-s` (DCO).

Report each finding in one line and carry on: they feed the Step 4 summary
and never block the branch decision. Skip a check whose file does not exist in
this project (no `.node-version`).

### 2 — Infer the change scope

From the task in front of you, work out **which paths will be edited** and
whether any touch `.claude-plugin/`, `bin/`, `tests/` or `.github/` (they
change what CI trusts). This drives how much review the PR needs. Every
change still gets a branch and a pull request: the `main` ruleset has no
direct-push path for anyone, so there is no "optional PR" case here.

### 3 — Recommend each decision

- **Branch** — recommend `feat/<slug>` (or `fix/<slug>` for a bug fix), with
  the slug derived from the task (kebab-case, short). If the repo is already
  on a suitable non-`main` branch, recommend **staying** on it. Never
  recommend `main` or a detached-on-`main` HEAD for guarded work.
- **PR required?** — **yes** whenever a guarded path is in scope: land via
  PR, never a direct commit to `main`. For docs/config-only changes, note
  that a PR is optional but still recommended.
- **Push target** — `origin <the recommended branch>`. Never `origin main`.

### 4 — Confirm with the user (blocking)

Ask every decision that applies in **one** `AskUserQuestion` call — branch,
PR-required, and push target — one question per decision, with your inferred
recommendation listed **first** and labelled "(Recommended)". For the
branch, offer the inferred `feat/<slug>` plus an "Other" path for a custom
slug. Make it explicit in your framing that **nothing is written and no
branch is created until they confirm** — this is the whole point of the
gate.

If the user has _already_ told you the branch to use (e.g. "do it on
`fix/foo`"), don't re-ask that dimension — treat it as confirmed and only
surface the decisions still open.

### 5 — Act on the confirmed decisions

If `.claude/skills/working-in-worktrees/` exists (an optional add-on, not
part of this baseline), use its start mode for this step instead of a bare
`git switch -c` — it gets the same branch, plus an isolated worktree and its
own installed dependencies in one move. Otherwise:

```bash
git switch -c feat/<slug>   # or fix/<slug>
```

Verify `HEAD` is neither `main` nor detached-on-`main` before handing back;
if it is, loop back to Step 4 rather than proceeding into a write that the
guard will reject. When **resuming an existing feature branch** that may
have fallen behind, resync it with `origin/main` before working (or defer to
the resync step in `creating-prs`) so the branch does not drift from the
base over multiple sessions.

### 6 — Hand back

Report a one-line summary of the confirmed decisions — branch, PR
(yes/no), push target — so the calling skill or the user proceeds with the
context recorded.
