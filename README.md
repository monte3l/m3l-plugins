# m3l-plugins

[![verify](https://github.com/monte3l/m3l-plugins/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/monte3l/m3l-plugins/actions/workflows/verify.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/monte3l/m3l-plugins/badge)](https://securityscorecards.dev/viewer/?uri=github.com/monte3l/m3l-plugins)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15760/badge)](https://www.bestpractices.dev/projects/15760)

A Claude Code plugin marketplace with one catalogue for every plugin the organization publishes, each pinned to a release.

## Who is this for

Anyone who wants a `monte3l` Claude Code plugin, and any `monte3l` maintainer who ships one.

## Quickstart

```bash
claude plugin marketplace add monte3l/m3l-plugins
claude plugin install <plugin>@monte3l
```

Inside a session, the same two steps are `/plugin marketplace add monte3l/m3l-plugins` and `/plugin install <plugin>@monte3l`.

> [!IMPORTANT]
> Earlier installs came from three marketplaces: `monte3l` (from `monte3l/m3l-groundwork`), `monte3l-prompt-optimizer` and `monte3l-output-governor`. Claude Code allows one marketplace per name, so remove the old one first with `claude plugin marketplace remove <name>`, then add this one. Plugin ids do not change.

## How it works

This repository holds no plugin code. Each entry in `.claude-plugin/marketplace.json` points at a plugin's own repository, pinned to a release tag and the full commit SHA that tag resolves to. A plugin reaches users only after a pull request here moves its pin.

Entries never carry a `version`. The plugin's own `plugin.json` owns it, so a new release is picked up as soon as the pin moves.

## Plugins

| Plugin | What it does | Source |
| --- | --- | --- |
| `m3l-groundwork-customize` | Adds the `/customize` skill, which tailors a project bootstrapped by `@monte3l/groundwork`. | [m3l-groundwork](https://github.com/monte3l/m3l-groundwork) |
| `m3l-prompt-optimizer` | Refines the prompts you type; a clear prompt passes through unchanged. | [m3l-prompt-optimizer](https://github.com/monte3l/m3l-prompt-optimizer) |
| `m3l-output-governor` | Measures where Claude Code's output tokens go and which levers cut them. | [m3l-output-governor](https://github.com/monte3l/m3l-output-governor) |

## Requirements

Claude Code 2.1.275 or later for the one-step `claude plugin install <plugin> --marketplace monte3l/m3l-plugins` form. Node.js, as pinned in `.node-version`, to run the scripts in `bin/`.

## Working on this repo

| Command | Purpose |
| --- | --- |
| `claude plugin validate --strict .` | Validates the catalog. It does not fetch remote sources. |
| `node bin/check-catalog.mjs` | Fails unless every pin matches its release tag, `plugin.json` and the table above. |
| `node bin/bump-pins.mjs --check` | Reports plugins with a newer release. `--apply` rewrites the pins. |
| `node --test "tests/*.test.mjs"` | Runs the unit tests for `bin/`. They need no network. `verify` adds a coverage gate of 80%. |
| `node --test "tests/property/*.property.test.js"` | Runs the fast-check property tests. Install first with `npm ci --ignore-scripts --prefix tests/property`. |
| `.github/dev-tools/node_modules/.bin/eslint -c .github/dev-tools/eslint.config.mjs .` | Lints the JavaScript. Install first with `npm ci --ignore-scripts --prefix .github/dev-tools`. |
| `bin/smoke-install.sh` | Adds the catalog to a throwaway profile and installs every plugin. |

To list a plugin, open a pull request that adds its entry and a row in the table above. The entry needs a `tagPattern` under `metadata.m3l`, a `homepage` on `monte3l.com`, and a `description` identical to the plugin's `plugin.json`.

## Project

| Document | What it covers |
| --- | --- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to report a bug, set up, write a change and list a plugin |
| [`GOVERNANCE.md`](GOVERNANCE.md) | Who decides, how access is granted and what happens if an owner is unavailable |
| [`ROADMAP.md`](ROADMAP.md) | What is planned for the next year, and what will not be done |
| [`SECURITY.md`](SECURITY.md) | How to report a vulnerability, the response process and the secrets inventory |
| [`docs/architecture.md`](docs/architecture.md) | How the catalog, the scripts and the workflows fit together |
| [`docs/assurance-case.md`](docs/assurance-case.md) | The threat model and the argument that the catalog is secure |
| [Code of Conduct](https://github.com/monte3l/.github/blob/main/CODE_OF_CONDUCT.md) | The organization's standard for taking part |

## License

MIT. See [LICENSE](LICENSE).
