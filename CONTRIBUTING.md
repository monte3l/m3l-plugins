# Contributing

`m3l-plugins` is the `monte3l` plugin marketplace. Open an **issue** first for anything beyond a pin bump, so the direction is agreed before you spend time on it. Pull requests are limited to collaborators: if you cannot open one, the issue is the contribution.

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

Branch from `main` as `feat/`, `fix/`, `ci/`, `chore/` or `docs/` plus a slug, and open a pull request. Merge with a merge commit.

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
