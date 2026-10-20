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
| `JANITOR_APP_CLIENT_ID`, `JANITOR_APP_PRIVATE_KEY` | `env-janitor` environment, restricted to `main` | Client ID and private key of the `monte3l-env-janitor` GitHub App, used by the weekly environment cleanup. The token it mints is limited to this repository: `administration: write`, `deployments: write`, `environments: read`, never repository secrets | The private key does not expire |

No workflow holds an Anthropic API key.

> [!NOTE]
> Accepted risk: the `plugin` lane of `verify.yml` installs `@anthropic-ai/claude-code` from `.github/ci-tools/` **with** its install script, because the script fetches the native binary. The lockfile pins the package by integrity hash, Dependabot proposes bumps after a one-day cooldown, and the job holds read-only permissions and no secrets. The same lane installs the listed plugins into a throwaway profile, which clones each pinned commit.

## Accepted OpenSSF Scorecard findings

Background, not policy: this explains the Scorecard results for anyone who looks them up. `scorecard.yml` runs weekly and surfaces its findings as Code Scanning alerts. The ones below are dismissed as deliberate or time-based, not defects. Do not "fix" the first one into a standing bypass.

| Check | Score | Why it stays |
| --- | --- | --- |
| Branch-Protection | 8 | The top tier asks for two approvals. The organization has two members, so a PR has one reviewer who is not its author, and requiring two would block every merge unless a standing bypass existed. The `main` ruleset has an empty bypass list on purpose. Every other protection is on: a code-owner approval, approval of the last push, stale-review dismissal, an up-to-date branch, required checks, signed commits, and no force-push or deletion |
| Code-Review | 6 | The first commit landed before the `main` ruleset existed, because a ruleset cannot be applied to an empty repository. Every PR since needs a code-owner approval, so the approved share rises as PRs merge. The alert is dismissed only until the score reaches 10 |
| Maintained | 0 | Scorecard scores any repository under 90 days old as 0. This one was created on 2026-10-20, so it resolves itself in January 2027 |
| Fuzzing | 0 | Not applicable. The inputs are this repository's own catalog and the output of `git ls-remote`, not an untrusted network or binary parser. A fuzzing library would also end the repository's no-dependency rule |

The OpenSSF Best Practices badge is a real gap, not an accepted one. The project registers for it, and the alert stays open until the badge reaches Passing.
