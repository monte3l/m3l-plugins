# CLAUDE.md

`m3l-plugins` is the `monte3l` Claude Code plugin marketplace: a catalog, with no plugin code. Standing rules for the whole workspace are in `~/workspaces/monte3l/CLAUDE.md`.

This file sits in `.claude/`, not the repo root: a root `CLAUDE.md` makes `claude plugin validate --strict .` warn.

## Commands

| Command | Purpose |
| --- | --- |
| `claude plugin validate --strict .` | Catalog schema. Does not fetch remote sources |
| `node bin/check-catalog.mjs` | Every pin is a release tag of a `monte3l` repo, its `sha` is what the tag resolves to, `description` equals `plugin.json`'s, and the README table has a row |
| `node bin/bump-pins.mjs --check` | `OK` or `STALE` per plugin. `--apply` rewrites `ref` and `sha` |
| `node --test "tests/*.test.mjs"` | Unit tests for `bin/`. Offline; add one with every change to `bin/` |
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
