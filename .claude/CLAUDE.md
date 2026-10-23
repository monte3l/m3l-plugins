# CLAUDE.md

`m3l-plugins` is the `monte3l` Claude Code plugin marketplace: a catalog, with no plugin code. Standing rules for the whole workspace are in `~/workspaces/monte3l/CLAUDE.md`.

This file sits in `.claude/`, not the repo root: a root `CLAUDE.md` makes `claude plugin validate --strict .` warn.

## Commands

| Command | Purpose |
| --- | --- |
| `claude plugin validate --strict .` | Catalog schema. Does not fetch remote sources |
| `node bin/check-catalog.mjs` | Every pin is a release tag of a `monte3l` repo, its `sha` is what the tag resolves to, `description` equals `plugin.json`'s, and the README table has a row |
| `node bin/bump-pins.mjs --check` | `OK` or `STALE` per plugin. `--apply` rewrites `ref` and `sha` and copies the new `plugin.json` description. `--only owner/repo` limits it to one repository |
| `PAYLOAD_REPOSITORY=monte3l/<repo> node bin/bump-for-release.mjs` | What the `Pins` workflow runs on a `release-published` dispatch: checks the repository is listed, bumps only its pins and adds the CHANGELOG line. Edits files only; the workflow opens the pull request |
| `node --test "tests/*.test.mjs"` | Unit tests for `bin/`. Offline; add one with every change to `bin/`. `verify` gates `bin/` at 80% lines, branches and functions with `--experimental-test-coverage --test-coverage-include='bin/**'` |
| `node --test "tests/property/*.property.test.js"` | fast-check property tests of the parsers. Needs `npm ci --ignore-scripts --prefix tests/property`. A failure's counterexample becomes a regression test in `tests/` |
| `.github/dev-tools/node_modules/.bin/eslint -c .github/dev-tools/eslint.config.mjs .` | ESLint over `bin/`, `tests/`, the hooks and `docs.config.mjs`. Needs `npm ci --ignore-scripts --prefix .github/dev-tools` |
| `bin/smoke-install.sh` | Installs every plugin into a throwaway `HOME` |
| `node design/source/docs-kit/build.mjs --check` | Docs site gate |

## Rules

- Never set `version` on an entry. `plugin.json` owns it.
- A pin is a tag **and** its full commit SHA. For an annotated tag that is the peeled commit (`^{}`), not the tag object.
- Sources are `url` or `git-subdir` with a full `https://github.com/` URL. The `github` type and `owner/repo` shorthand clone over SSH and fail without a key. Test with `GIT_SSH_COMMAND=false bin/smoke-install.sh`.
- Never rename a listed plugin.
- Every tracked `.md` file needs a `pages` or `exclude` entry in `docs.config.mjs`.
- `design/source/` is vendored from m3l-design. Never hand-edit it.
- Work through a pull request from a `feat/`, `fix/`, `ci/`, `chore/` or `docs/` branch. Commits are signed and signed off (`git commit -s`).

## Harness

Installed by `/customize`. None of it runs in CI; it only shapes Claude Code sessions in this checkout.

| File | Purpose |
| --- | --- |
| `.claude/settings.json` | Deny rules for `.env*`, lockfiles and `.git/`; hook registrations; the status line |
| `.claude/hooks/guard-git-push-signed.mjs` | Blocks `git push` when an outgoing commit is unsigned (imports `bin/lib/signed-range.mjs`) |
| `.claude/hooks/guard-double-background.mjs` | Blocks a backgrounded command that also sets `run_in_background` |
| `.claude/hooks/guard-secret-writes.mjs` | Blocks writes of `.env` files and token literals |
| `.claude/hooks/statusline.mjs`, `.claude/hooks/subagent-statusline.mjs`, `.claude/hooks/statusline-layout.mjs` | Status line renderers |
| `.claude/agents/Explore.md`, `.claude/agents/code-reviewer.md`, `.claude/agents/silent-failure-hunter.md` | Read-only search and review spokes |
| `.claude/skills/starting-work/SKILL.md`, `.claude/skills/writing-commits/SKILL.md`, `.claude/skills/creating-prs/SKILL.md`, `.claude/skills/finishing-work/SKILL.md`, `.claude/skills/triaging-ci/SKILL.md` | The branch, commit, PR, close-out and CI-triage workflow, targeted at this repo's `verify` lanes |
| `.claude/skills/reviewing-dependabot-prs/SKILL.md`, `.claude/skills/triaging-scan-alerts/SKILL.md`, `.claude/skills/watching-pr-checks/SKILL.md` | `gh`-driven PR skills |
| `.claude/skills/harness-guidance/SKILL.md` | Checks this `.claude/` surface against current Anthropic guidance; its state is `docs/research/harness-refresh.md` |

There is no TypeScript here, so the baseline's `typescript-guidance` skill, its writer agents and its `src/`-path hooks were not installed.
