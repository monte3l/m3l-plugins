# Contributing

`m3l-plugins` is the `monte3l` plugin marketplace. Open an **issue** first for anything beyond a pin bump, so the direction is agreed before you spend time on it. Pull requests are limited to collaborators: if you cannot open one, the issue is the contribution.

Everyone taking part follows the organization's [Code of Conduct](https://github.com/monte3l/.github/blob/main/CODE_OF_CONDUCT.md).

## Prerequisites

| Tool | Why |
| --- | --- |
| Node.js, the major in `.node-version` | Runs `bin/` and the tests |
| `git`, with commit signing set up | The `main` ruleset rejects unsigned commits |
| `jq` and `shellcheck` | The `checks` lane runs them |
| The `claude` CLI | `claude plugin validate` and `bin/smoke-install.sh` need it |
| `gh` | The branch, pull-request and close-out skills in `.claude/skills/` use it |

## Setup

```bash
git clone https://github.com/monte3l/m3l-plugins.git
cd m3l-plugins
node bin/check-catalog.mjs          # needs the network
node --test "tests/*.test.mjs"      # needs nothing else
```

The repository's own scripts need no `npm install`. Only the lint and property lanes install packages, each from its own directory (see "Tests").

## Reporting a bug

Open an issue at [`monte3l/m3l-plugins`](https://github.com/monte3l/m3l-plugins/issues/new/choose) and say:

- your Claude Code version (`claude --version`),
- the command you ran, what you expected and what happened,
- the output of `claude plugin marketplace list`.

Report a suspected security vulnerability privately. See [`SECURITY.md`](SECURITY.md), and never open a public issue for it.

## Commits

| Rule | Why |
| --- | --- |
| [Conventional Commits](https://www.conventionalcommits.org) | The history reads as a changelog |
| `Signed-off-by:` trailer (`git commit -s`) | Developer Certificate of Origin: you may submit this |
| GPG- or SSH-signed | The `main` ruleset rejects unsigned commits |

### Developer Certificate of Origin

By signing off a commit (`git commit -s`) you certify the [Developer Certificate of Origin](https://developercertificate.org/): that you wrote the change, or otherwise have the right to submit it under this project's license. CI enforces it: the `DCO sign-off` job, a required check and a lane `verify` waits on, fails a pull request when any commit it adds lacks a `Signed-off-by: Name <email>` trailer whose email is that commit's author or committer email. Merge commits are skipped, and so are a Dependabot pull request's own commits. To fix a failure, run `git commit --amend -s --no-edit` for the last commit, or `git rebase --signoff <base>` for several, and force-push your own branch.

Branch from `main` as `feat/, `fix/`, `ci/`, `chore/` or `docs/` plus a slug, and open a pull request. Merge with a merge commit.

## Tests

A change to `bin/` adds tests for new behavior, and a fix adds a regression test. The unit tests live in `tests/`, use `node:test`, need no network and no packages, and run in the `verify` check. The `checks` lane fails when `bin/` drops below 80% of lines, branches or functions covered:

```bash
node --test --experimental-test-coverage --test-coverage-include='bin/**' \
  --test-coverage-lines=80 --test-coverage-branches=80 --test-coverage-functions=80 \
  "tests/*.test.mjs"
```

The parsers that read outside input also have property-based tests in `tests/property/`, written with fast-check. When one fails it prints the seed and a shrunk counterexample: fix the code, then add that case to `tests/` as a regression test.

```bash
npm ci --ignore-scripts --prefix tests/property
node --test "tests/property/*.property.test.js"
```

ESLint checks the JavaScript. Its version is pinned in `.github/dev-tools/`:

```bash
npm ci --ignore-scripts --prefix .github/dev-tools
.github/dev-tools/node_modules/.bin/eslint -c .github/dev-tools/eslint.config.mjs .
```

### Test environments and how tests run

| Kind | Where it runs | What triggers it | How to read the result |
| --- | --- | --- | --- |
| Unit tests with the coverage gate | `ubuntu-latest`, on the Node major in `.node-version` | Every pull request and every push to `main` | The `Checks` job. A failure names the test, and a missed gate prints the coverage table |
| Property tests | `ubuntu-latest`, same Node | Every pull request and push | The `Property tests` job. A failure prints the seed and the shrunk counterexample |
| Lint | `ubuntu-latest`, same Node | Every pull request and push | The `Lint` job lists each ESLint finding with its file and line |
| Catalog and smoke install | `ubuntu-latest`, with the network | Every pull request and push | The `Catalog` and `Plugin` jobs |

The first four also run on your machine with the commands above. Locally, the tests run on macOS and Linux. The catalog and smoke-install checks need the network, and Windows is not a supported environment. The aggregate `verify` job goes green only when every lane reports success.

## Coding standards

| What | The standard | Enforced by |
| --- | --- | --- |
| JavaScript | ESLint's recommended rules plus `eqeqeq`, `no-var` and `prefer-const`, with unused disable directives an error (`.github/dev-tools/eslint.config.mjs`) | The `lint` lane |
| Shell | `shellcheck` clean | The `checks` lane |
| Workflows | `actionlint` and `zizmor` clean, every action pinned to a commit SHA, per-job `permissions:` | `workflow-lint.yml` |
| Formatting | `.editorconfig` | Review |
| Licenses | An SPDX declaration for every file (`REUSE.toml` or a header) | `reuse.yml` |
| Commit messages | Conventional Commits, signed off and signed | The `DCO sign-off` job and the `main` ruleset |
| Markdown | The m3l-design rules: bold, never italics or underlines, an alert matched to severity and never more than two in a row, tables for tabular data | Review, and the docs kit's `--check` |

A change that breaks one of these fails a required check. There is no separate style review: the tooling is the standard.

## Scope of a pull request

- **New behavior in `bin/` MUST come with tests.** A change that adds behavior has unit tests covering it, and `verify` fails if `bin/` drops below 80% of lines, branches or functions covered.
- **A bug fix MUST add a regression test** that fails against the old code and passes against the fix.
- A change to `.claude-plugin/`, `bin/`, `tests/` or `.github/` changes what CI trusts, so say in the description what it affects.
- Docs that describe the change are updated in the same pull request.

## Code review

Every pull request needs one approval from a code owner other than its author, and every review thread resolved. The `main` ruleset enforces both with no bypass. What a reviewer checks:

- **Correctness.** The change does what it says, with tests.
- **Fail-closed behavior.** A lookup that fails is reported, never swallowed, and no optional chaining hides an error that should surface.
- **Security.** Input validated at any new boundary, no new dependency without a reason, no secret written to disk, no workflow value interpolated into a script.
- **Permissions.** A workflow change keeps each job's permissions as small as it was.
- **Drift.** `README.md`, this file, `SECURITY.md` and `.claude/CLAUDE.md` still match the code.
- **Process.** A signed commit, a DCO sign-off and a Conventional Commit type that matches the change.

## Adding a dependency

The scripts in `bin/` take no dependencies, and a new one needs a strong reason. For a tool in CI, the candidate must:

- be needed by a check this repository runs, and not have an acceptable alternative in the Node standard library,
- carry an allowed license (the allow-list is in `dependency-review.yml`),
- be actively maintained and widely used, with no open critical or high advisory,
- be pinned to an exact version in a committed lockfile and installed with `--ignore-scripts`, unless its install script is the point.

It goes in its own tool directory with a Dependabot entry, never in a lane that holds a secret.

## Account security

The `monte3l` GitHub organization requires two-factor authentication for every member. Use an authenticator app (TOTP) or a hardware security key, not SMS: an SMS second factor is not encrypted and does not meet this project's bar.

## Small tasks for newcomers

Pull requests are limited to collaborators, so a small contribution is an issue: a docs fix, a clearer error message, a missing test case. Open one describing what you would change. A maintainer either implements it with a credit to you, or invites you as a collaborator after the checks in [`GOVERNANCE.md`](GOVERNANCE.md#granting-access).

## Listing a plugin

A plugin lives in its own repository and is listed here by a pin. The plugin repository must:

- ship `.claude-plugin/plugin.json` with a `version`, and **no** `marketplace.json` of its own,
- pass `claude plugin validate --strict .` in its own `verify`,
- have a homepage on `monte3l.com`,
- publish releases as signed tags. `claude plugin tag` produces `<name>--vX.Y.Z`, which is the default.

Then add one entry to `.claude-plugin/marketplace.json` and a row to the plugin table in `README.md`.

| Field | Rule |
| --- | --- |
| `name` | Equal to `plugin.json`'s `name`. Never rename a listed plugin |
| `description` | Identical to `plugin.json`'s `description` |
| `source` | `url`, or `git-subdir` for a plugin inside a larger repository. Both take the **full** `https://github.com/<owner>/<repo>.git` URL, never `owner/repo` shorthand and never the `github` type: both clone over SSH, which fails for anyone without a GitHub key. Both need `ref` (a release tag) and `sha` (the full 40-character commit that tag points to) |
| `homepage` | `https://<name>.monte3l.com` |
| `metadata.m3l.tagPattern` | A glob with one `*` for the version, such as `m3l-prompt-optimizer--v*` |
| `version` | **Never set.** `plugin.json` owns it, and setting both makes the two disagree |

## Moving a pin

When a listed plugin ships a release, its release workflow sends
`release-published` and the `pins` workflow opens a pull request that moves
that plugin's pin, copies its `plugin.json` description (`check-catalog` requires them to match) and adds the `CHANGELOG.md` line. Review the diff and merge
it: `check-catalog` and the smoke install run on it as required checks. The
pull request takes the new `ref` and `sha` from `git ls-remote`, never from the
dispatch, and moves only the repository that released.

If no pull request appears (the dispatch failed, or a plugin's release workflow
does not send one yet), the daily `pins` workflow opens or updates an issue
naming the stale pin. To act on it by hand:

```bash
node bin/bump-pins.mjs --apply
node bin/check-catalog.mjs
bin/smoke-install.sh
```

Review the diff, add a line to `CHANGELOG.md`, and open the pull request.
`--only owner/repo` limits the bump to one repository.

## Removing or renaming a plugin

Do neither lightly: every installed copy is keyed on the plugin name. To retire one, remove its entry and set `forceRemoveDeletedPlugins` only when you want it uninstalled from users' machines. To rename one, add a `renames` mapping and keep it forever.
