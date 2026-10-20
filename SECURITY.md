# Security Policy

## Scope

This covers `m3l-plugins`: the catalog in `.claude-plugin/marketplace.json`, the scripts in `bin/`, and the CI that checks them. The catalog decides which code Claude Code users install, so a wrong or tampered pin is the main risk. Each entry is pinned to a full commit SHA, and `bin/check-catalog.mjs` fails unless that SHA is what the release tag resolves to.

## Supported versions

| Version | Supported |
| --- | --- |
| Latest commit on `main` | Yes |
| Anything else | No |

This is a single-maintainer project. Only the latest commit on `main` gets a fix.

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/monte3l/m3l-plugins/security/advisories/new) for this repository.

> [!IMPORTANT]
> Do not open a public issue for a suspected vulnerability.

Include the affected plugin and pin, the steps to reproduce and the impact you think it has. A vulnerability in a listed plugin itself belongs in that plugin's repository, so report it there.

You should get an acknowledgment within 7 days. There is no fixed disclosure timeline beyond that, but you will hear back before a fix ships.

## Secrets this repository holds

| Secret | Scope | Reaches | Expiry |
| --- | --- | --- | --- |
| `GITLEAKS_LICENSE` | Organization secret shared with this repository | A free license for the Gitleaks action. It reads nothing in the repository | Annual renewal |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `docs-cloudflare` environment, restricted to `main` | Deploys the docs site. The token is limited to Workers Scripts and Routes on the `monte3l.com` zone | Within one year |

No workflow holds an Anthropic API key.

> [!NOTE]
> Accepted risk: the `plugin` lane of `verify.yml` installs `@anthropic-ai/claude-code` from `.github/ci-tools/` **with** its install script, because the script fetches the native binary. The lockfile pins the package by integrity hash, Dependabot proposes bumps after a one-day cooldown, and the job holds read-only permissions and no secrets. The same lane installs the listed plugins into a throwaway profile, which clones each pinned commit.
