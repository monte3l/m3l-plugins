# m3l-plugins

[![verify](https://github.com/monte3l/m3l-plugins/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/monte3l/m3l-plugins/actions/workflows/verify.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/monte3l/m3l-plugins/badge)](https://securityscorecards.dev/viewer/?uri=github.com/monte3l/m3l-plugins)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15760/badge)](https://www.bestpractices.dev/projects/15760)

The `monte3l` Claude Code plugin marketplace: one catalog for every plugin the organization publishes.

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

## License

MIT. See [LICENSE](LICENSE).
