# m3l-plugins

[![verify](https://github.com/monte3l/m3l-plugins/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/monte3l/m3l-plugins/actions/workflows/verify.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/monte3l/m3l-plugins/badge)](https://securityscorecards.dev/viewer/?uri=github.com/monte3l/m3l-plugins)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15760/badge)](https://www.bestpractices.dev/projects/15760)

A Claude Code plugin marketplace with one catalogue for every plugin the organization publishes, each pinned to a release.

## Who is this for

Anyone who wants a `monte3l` Claude Code plugin, and any `monte3l` maintainer who ships one.

## Quickstart

From your shell:

```bash
claude plugin marketplace add monte3l/m3l-plugins
claude plugin install <plugin>@monte3l
```

Or inside a Claude Code session:

```text
/plugin marketplace add monte3l/m3l-plugins
/plugin install <plugin>@monte3l
```

To add the marketplace and install in one step, use `claude plugin install <plugin> --marketplace monte3l/m3l-plugins` or `/plugin install <plugin> --marketplace monte3l/m3l-plugins`. The shell form installs at user scope unless you pass `--scope project` or `--scope local`. The session form opens the plugin's details and asks you to pick a scope.

> [!IMPORTANT]
> Earlier installs came from three marketplaces: `monte3l` (from `monte3l/m3l-groundwork`), `monte3l-prompt-optimizer` and `monte3l-output-governor`. Claude Code allows one marketplace per name, so remove the old one first, then add this one. Plugin ids do not change.
>
> ```bash
> claude plugin marketplace remove <name>
> ```
>
> ```text
> /plugin marketplace remove <name>
> ```

## Settings

Each plugin declares its own options, and the catalog adds none. A plugin that has options lists them in its README. To set them:

| Way | From your shell | Inside a session |
| --- | --- | --- |
| At install | `claude plugin install <plugin>@monte3l --config key=value`, repeatable | Not available; configure after the install |
| Later | `claude plugin configure <plugin>@monte3l --values-stdin`, with a JSON object of single-line strings on stdin | `/plugin`, then **Installed**, the plugin, **Configure options** |
| Check what is set | `claude plugin configure <plugin>@monte3l`, which never prints secrets | The same dialog |

> [!WARNING]
> Never pass a key or token with `--config`: it lands in your shell history. Use `--values-stdin` or the dialog.

## Manage plugins

| Task | From your shell | Inside a session |
| --- | --- | --- |
| Update a plugin | `claude plugin update <plugin>@monte3l` | `/plugin`, then **Installed**, the plugin, **Update now** |
| Update the listing | `claude plugin marketplace update monte3l` | `/plugin marketplace update monte3l` |
| Update automatically | Not available | `/plugin`, then **Marketplaces**, `monte3l`, **Enable auto-update** |
| Turn off or on | `claude plugin disable <plugin>@monte3l`, then `claude plugin enable <plugin>@monte3l` | `/plugin disable <plugin>@monte3l`, then `/plugin enable <plugin>@monte3l` |
| Uninstall | `claude plugin uninstall <plugin>@monte3l` | `/plugin uninstall <plugin>@monte3l` |
| Remove the marketplace | `claude plugin marketplace remove monte3l` | `/plugin marketplace remove monte3l` |

`monte3l` is not an official Anthropic marketplace, so Claude Code does not update its plugins automatically unless you turn auto-update on. After a change inside a session, run `/reload-plugins` to apply it.

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

Claude Code 2.1.292 or later for the one-step `claude plugin install <plugin> --marketplace monte3l/m3l-plugins` form in your shell, and 2.1.275 or later for `/plugin install <plugin> --marketplace monte3l/m3l-plugins` in a session. Node.js, as pinned in `.node-version`, to run the scripts in `bin/`.

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
