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
| `source` | `github`, or `git-subdir` for a plugin inside a larger repository. Both need `ref` (a release tag) and `sha` (the full 40-character commit that tag points to) |
| `homepage` | `https://<name>.monte3l.com` |
| `metadata.m3l.tagPattern` | A glob with one `*` for the version, such as `m3l-prompt-optimizer--v*` |
| `version` | **Never set.** `plugin.json` owns it, and setting both makes the two disagree |

## Moving a pin

When a listed plugin ships a release, the daily `pins` workflow opens or updates an issue naming it. To act on it:

```bash
node bin/bump-pins.mjs --apply
node bin/check-catalog.mjs
bin/smoke-install.sh
```

Review the diff, add a line to `CHANGELOG.md`, and open the pull request.

## Removing or renaming a plugin

Do neither lightly: every installed copy is keyed on the plugin name. To retire one, remove its entry and set `forceRemoveDeletedPlugins` only when you want it uninstalled from users' machines. To rename one, add a `renames` mapping and keep it forever.
