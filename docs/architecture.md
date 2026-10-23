# Architecture

`m3l-plugins` is a catalog, not a program. Its one product is `.claude-plugin/marketplace.json`: a list of plugins, each pinned to a release tag and the commit that tag resolves to. Everything else here exists to keep those pins true and to publish a docs site.

## The catalog

Each entry has a `name`, a `description`, a `homepage`, a `source` and a `metadata.m3l.tagPattern`. The `source` is a full `https://github.com/` URL with a `ref` (a release tag) and a `sha` (the full 40-character commit). An entry never carries a `version`: the plugin's own `plugin.json` owns it.

```text
 Claude Code user                 this repository                    plugin repository
 ----------------                 ---------------                    -----------------
 plugin marketplace add  ====>  marketplace.json  == ref + sha ==>  tag, then its commit
 plugin install          <====  (the catalog)     <== plugin.json ==  .claude-plugin/
```

Claude Code reads the catalog, then clones the pinned commit of the plugin. A pull request here is the only way a new plugin version reaches users.

## Scripts in `bin/`

| Script | What it does | Reads the network? |
| --- | --- | --- |
| `check-catalog.mjs` | Fails unless every pin is a release tag of a `monte3l` repository, its `sha` is what the tag resolves to, `description` equals the pinned `plugin.json`'s, and the README table has a row | Yes: `git ls-remote` and `raw.githubusercontent.com` |
| `bump-pins.mjs` | `--check` reports a pin older than the newest release tag. `--apply` rewrites `ref`, `sha` and `description` | Yes: `git ls-remote` |
| `bump-for-release.mjs` | Run by the `Pins` workflow for one `release-published` dispatch. Checks the repository is listed, bumps only its pins and adds the CHANGELOG line | Through `bump-pins.mjs` |
| `smoke-install.sh` | Adds the catalog to a throwaway `HOME` and installs every plugin from it | Yes: clones each pinned commit |

The logic lives in `bin/lib/`. The entry scripts only read arguments and print.

| Module | Responsibility |
| --- | --- |
| `lib/catalog.mjs` | Reading the catalog, parsing `git ls-remote`, matching release tags, the offline entry rules, `checkCatalog`, `parseBumpArgs` and `fetchManifest` |
| `lib/dispatch.mjs` | Validating a `release-published` payload, diffing two catalogs into bumps and writing the CHANGELOG line |
| `lib/signed-range.mjs` | The git-signature helpers used by the push guard in `.claude/hooks/` |

Every network or parse failure throws, so a caller fails closed. Nothing in `bin/` imports a package: the scripts use only the Node standard library.

## The pin workflow

```text
 plugin repo release workflow
        |  repository_dispatch: release-published { repository }
        v
 pins.yml / bump  ---- mint a token for this repository only (monte3l-release App)
        |  bump-for-release.mjs
        |    1. is the repository listed?            (validateDispatch)
        |    2. git ls-remote -> newest tag and sha   (the payload names only the repository)
        |    3. rewrite ref, sha, description; add the CHANGELOG line
        v
 pull request, committed through the API as the App (so GitHub signs it)
        |  required checks run: verify, Dependency Review, CodeQL, Gitleaks, DCO sign-off
        v
 a code owner approves and merges -> the pin is live
```

A forged dispatch can at worst open a pull request for a release that really exists, because the new `ref` and `sha` come from `git ls-remote`, never from the payload. A person still reviews and merges. Once a day, `pins.yml / check` runs `bump-pins.mjs --check` and opens or updates one issue when a pin is stale.

## Workflows

Every workflow starts with `permissions: {}` or `contents: read`, and each job sets only what it needs. Every action is pinned to a commit SHA. No workflow uses `pull_request_target` or `workflow_run`.

| Workflow | Trigger | Writes | Secrets |
| --- | --- | --- | --- |
| `verify.yml` | push to `main`, pull request | Nothing | None |
| `dependency-review.yml` | pull request | Nothing | None |
| `gitleaks.yml` | push, pull request, weekly, manual | Nothing | `GITLEAKS_LICENSE` |
| `reuse.yml`, `workflow-lint.yml` | push, pull request | Nothing | None |
| `labeler.yml` | pull request | `pull-requests: write`, labels only | None |
| `scorecard.yml` | push to `main`, weekly, manual | `security-events: write`, `id-token: write` | None |
| `pins.yml` | daily, `release-published`, manual | `issues: write` in `check`. `bump` mints a repository-scoped App token with `contents: write` and `pull-requests: write` | `RELEASE_APP_*` |
| `docs.yml` | push to `main`, manual | Deploys the site to Cloudflare | `CLOUDFLARE_*`, organization secrets. The job runs in the `docs-cloudflare` environment, restricted to `main` |
| `docs-live.yml` | daily | Nothing. A failure shows as a failed run | None |
| `environments.yml` | weekly, manual | Mints an App token that deletes stale GitHub environments | `JANITOR_APP_*`, organization secrets. The job runs in the `env-janitor` environment, restricted to `main` |

The `verify` workflow is the one required lane aggregate. Its jobs are `checks`, `lint`, `property`, `catalog`, `plugin` and `dco`, and the final `verify` job passes only when every one of them reports `success`.

## The docs site

`design/` is a verbatim copy of an `m3l-design` release, never hand-edited. `docs.config.mjs` lists the Markdown pages, and `design/source/docs-kit/build.mjs` builds them into a static site. `verify` runs the kit's `--check`. `docs.yml` deploys the result to Cloudflare Workers Static Assets at `https://plugins.monte3l.com`, then fetches every page from the live site and requires it to equal what was built.

## The harness

`.claude/` shapes Claude Code sessions in a checkout: deny rules, the signed-push guard, the secret-write guard, and the skills for the branch, commit, pull-request and close-out workflow. None of it runs in CI and none of it is shipped. It is documented in [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Trust boundaries

| Boundary | What crosses it | What guards it |
| --- | --- | --- |
| Plugin repository to the catalog | A tag name and the commit it resolves to | `check-catalog.mjs` re-resolves the tag and compares the commit, and the pull request is reviewed |
| `repository_dispatch` payload to `bump-for-release.mjs` | A repository slug | `validateDispatch` accepts only a listed `monte3l/<repo>`. The payload never carries a ref or a sha |
| The catalog to a URL | An owner, repo, commit and path | `fetchManifest` refuses anything that is not a plain owner, repo, 40-hex commit and `.claude-plugin/plugin.json` path |
| CI to a secret | A token for one job | Per-job permissions, deploy jobs limited to `main` through their environments, and repository-scoped App tokens |
| This repository to a user's machine | The catalog | Claude Code clones the pinned commit over HTTPS. See [`assurance-case.md`](assurance-case.md) |

The full threat model is in [`assurance-case.md`](assurance-case.md).
