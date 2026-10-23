# Security Policy

## Scope

This covers `m3l-plugins`: the catalog in `.claude-plugin/marketplace.json`, the scripts in `bin/`, and the CI that checks them. The catalog decides which code Claude Code users install, so a wrong or tampered pin is the main risk. Each entry is pinned to a full commit SHA, and `bin/check-catalog.mjs` fails unless that SHA is what the release tag resolves to.

## Supported versions

| Version | Supported |
| --- | --- |
| Latest commit on `main` | Yes |
| Anything else | No |

This is a two-owner project with one active author. Only the latest commit on `main` gets a fix.

### Scope and duration of support

Support covers the catalog as it stands on `main`, the scripts in `bin/` and the CI that checks them. This repository publishes no releases, so there is no older version to support.

A commit is supported until the next commit lands on `main`. From then on it receives no fixes, security fixes included, and the remedy is to update to `main`. There is no fixed calendar duration and no long-term-support line. A plugin pinned in the catalog is supported by its own repository, under its own policy.

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/monte3l/m3l-plugins/security/advisories/new) for this repository.

> [!IMPORTANT]
> Do not open a public issue for a suspected vulnerability.

Include the affected plugin and pin, the steps to reproduce and the impact you think it has. A vulnerability in a listed plugin itself belongs in that plugin's repository, so report it there.

You should get an acknowledgment within 7 days, and you will hear back before a fix ships.

## Response process

1. **Acknowledge** the report within 7 days.
2. **Triage.** Reproduce it, and decide its severity and scope: this repository, or a listed plugin's own repository.
3. **Fix privately** in a security advisory's temporary private fork. A confirmed vulnerability of medium or higher severity is fixed within 60 days of confirmation, and a critical one as fast as a review allows.
4. **Request a CVE** through the advisory when the issue warrants one.
5. **Publish** the advisory once the fix is on `main`, crediting the reporter unless they ask not to be. The default disclosure date is the day the fix merges, and a reporter who wants a different date should say so in the report.

## Credit

A reporter of a vulnerability that is fixed and disclosed is credited in the GitHub security advisory and the CHANGELOG line, unless they ask to stay anonymous. There is no bug bounty. No vulnerability has been reported and resolved yet.

## What you can and cannot expect

**What this project guarantees.** Every catalog entry is pinned to a release tag and the full commit that tag resolves to, and `bin/check-catalog.mjs` re-checks both on every pull request. The scripts use only the Node standard library, take no input they do not validate, and run no code from a plugin they list. The repository holds no plugin code.

**What it does not guarantee.** It does not review a plugin's code: that is the plugin repository's job, and a listed plugin is trusted because the organization wrote it, not because this catalog audited it. It does not guarantee a plugin is free of vulnerabilities, only that you get the commit that was reviewed when its pin moved. See [`docs/assurance-case.md`](docs/assurance-case.md) for the threat model.

## Dependency and code-scanning findings

This is the policy for two kinds of automated finding: software composition analysis (SCA), meaning known vulnerabilities and licenses in dependencies, and static analysis (SAST), meaning CodeQL. It describes what is enforced today.

### What runs

| Check | When | On a finding |
| --- | --- | --- |
| Dependency Review (`dependency-review.yml`), required on `main` | Every pull request | Fails the PR if it adds or updates a dependency with a high or critical known vulnerability, or a license outside the allow-list in that file |
| CodeQL default setup, `javascript-typescript` and `actions`. Its `CodeQL` check is required on `main` | Every push and pull request | Fails the PR on a new alert of error severity or critical or high security severity, which is GitHub's default threshold |
| Gitleaks and GitHub secret scanning with push protection | Every push and pull request, and weekly in full | Fails the PR, or blocks the push |
| Dependabot alerts and updates (`dependabot.yml`) | Weekly, for GitHub Actions and the four npm tool directories | Opens an update PR. An alert on a locked dependency published after a merge is how a late advisory is caught |
| zizmor and actionlint (`workflow-lint.yml`) | Every change to a workflow | Fails the PR |

### Remediation thresholds

| Finding | Threshold |
| --- | --- |
| A critical or high SCA vulnerability | A PR that introduces one does not merge. One published against a dependency already locked is fixed (update, replace or remove) within 60 days of Dependabot raising it |
| A medium SCA vulnerability | Fixed within 60 days, through a dependency update |
| A low SCA vulnerability | Fixed in the normal course of dependency updates, with no deadline |
| A license outside the allow-list | A PR that adds one does not merge. Either the dependency is removed, or the license is added to the allow-list in the same PR with the reason in its description |
| A SAST (CodeQL) alert | A new alert of error severity or critical or high security severity blocks the PR. One in merged code at medium or higher is fixed within 60 days of triage. A dismissed alert records its reason in GitHub |

This repository publishes no releases, so there is no release to hold back. The equivalent gate is the merge: a pull request that fails these checks cannot merge, and the checks are required by the `main` ruleset.

### Process

1. **Identify.** The checks above, plus Dependabot and GitHub security advisories.
2. **Prioritize.** Severity first, then whether the code ships. Nothing in this repository ships to users except the catalog. The four npm tool directories run in CI only, so a finding there affects contributors and CI, not people who install a plugin.
3. **Remediate.** Update, replace or remove the dependency. A finding in a tool directory is fixed by moving its pinned version.
4. **Accept, only when nothing else works.** A finding that does not affect the project and has no patched version is dismissed in GitHub with its reason, and a vulnerability judged not exploitable is recorded under the next heading.

### Vulnerabilities that do not affect the project

An [OpenVEX](https://openvex.dev) document would state which published advisories do not affect the catalog and why. None is needed today: as of 2026-10-23 GitHub reports no open Dependabot alert and no open code-scanning alert, and no advisory has been judged not exploitable. When one is, the statement is added at `docs/m3l-plugins.openvex.json` in the same PR that dismisses the alert, with the reasoning in its description. The catalog itself declares no dependencies and bundles none.

## Secrets and credentials

This is the policy for the secrets this repository uses: how they are stored, who can reach them and when they are replaced. The first rule is to hold as few as possible.

### What the project does not store

- **No signing key for artifacts.** The repository publishes none.
- **No personal access token.** Where a job needs more than `GITHUB_TOKEN`, it mints a short-lived GitHub App installation token instead.
- **No Anthropic API key.** No workflow holds one.

### Inventory

As of 2026-10-23, read from the workflows and from the GitHub API, which lists secret names and dates and never values:

| Secret | What it is | Stored at | Used by | Scope and expiry |
| --- | --- | --- | --- | --- |
| `RELEASE_APP_CLIENT_ID`, `RELEASE_APP_PRIVATE_KEY` | Client ID and private key of the `monte3l-release` GitHub App | Organization secrets, visible to selected repositories | `pins.yml`, `bump` job, to open a pin pull request | The token it mints is limited to this repository with `contents: write` and `pull-requests: write`, and lasts an hour. The private key does not expire |
| `JANITOR_APP_CLIENT_ID`, `JANITOR_APP_PRIVATE_KEY` | Client ID and private key of the `monte3l-env-janitor` GitHub App | Organization secrets, visible to selected repositories | `environments.yml`, the weekly cleanup | The token it mints is limited to this repository: `administration: write`, `deployments: write`, `environments: read`, never repository secrets. The private key does not expire |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | A Cloudflare API token and the account id | Organization secrets, visible to selected repositories | `docs.yml`, `deploy` job, which runs in the `docs-cloudflare` environment restricted to `main` | The token is limited to Workers Scripts and Routes on the `monte3l.com` zone, with an expiry of at most one year |
| `GITLEAKS_LICENSE` | The license key the Gitleaks action needs for an organization-owned repository | Organization secret, visible to selected repositories | `gitleaks.yml` | It licenses a scanner and authenticates to nothing else. Annual renewal |
| `GITHUB_TOKEN` | GitHub's automatic per-run token | Created for each run | Every workflow | Each job sets its own `permissions:` block, and the repository default is read-only |

### Storing

- A secret lives only in GitHub Actions secrets, at the narrowest scope that works. It never goes in a file, a repository variable or a log.
- Secret scanning and push protection are on, and Gitleaks scans every push and pull request and runs weekly in full (`.gitleaks.toml`).

> [!NOTE]
> All seven secrets are **organization** secrets shared with selected repositories, not secrets of an environment. GitHub makes an organization secret available to every workflow in a repository it is shared with, so `docs-cloudflare` and `env-janitor` restrict where a deploy runs, not who can read the secret. The controls are the required review of every workflow change and the rule that each secret is named only in the workflow that needs it. Moving the Cloudflare and janitor secrets into their environments would close this and is on the [roadmap](ROADMAP.md).

### Accessing

- Only the two organization owners, `enri3l` and `giulmonte`, can create, replace or delete a secret. GitHub never shows a stored value back. The organization requires two-factor authentication, by authenticator app or hardware key (see [`CONTRIBUTING.md`](CONTRIBUTING.md#account-security)).
- No fork pull request receives a secret, and no workflow uses `pull_request_target` or `workflow_run`.

### Rotating

1. **At once** when a secret is exposed or suspected to be, or when someone with access to it leaves or loses a device that held a key.
2. **A credential that can expire is issued with an expiry of at most one year.** That is the Cloudflare token.
3. **A credential that cannot expire is replaced at least once a year.** That is the two GitHub App private keys: generate a new key in the App's settings, update the organization secret, delete the old key, then run the workflow that uses it to prove the new one works.
4. **`GITLEAKS_LICENSE`** is replaced when the license renews, or on exposure.
5. A rotation is recorded in the PR or issue that makes it, never with the value.

To compare this inventory with what is set, list names and dates with `gh api orgs/monte3l/actions/secrets` and `gh api repos/monte3l/m3l-plugins/actions/organization-secrets`.

### If one is exposed

Revoke it at the source first (the Cloudflare token, the App's private key, the license), then replace it, update the GitHub secret and re-run the workflow that uses it. Review the runs since the exposure. If it could have changed the catalog, handle it as a vulnerability report under "Response process".

## Accepted risk

> [!NOTE]
> Accepted risk: the `plugin` lane of `verify.yml` installs `@anthropic-ai/claude-code` from `.github/ci-tools/` **with** its install script, because the script fetches the native binary. The lockfile pins the package by integrity hash, Dependabot proposes bumps after a one-day cooldown, and the job holds read-only permissions and no secrets. The same lane installs the listed plugins into a throwaway profile, which clones each pinned commit.

## Accepted OpenSSF Scorecard findings

Background, not policy: this explains the Scorecard results for anyone who looks them up. `scorecard.yml` runs weekly and surfaces its findings as Code Scanning alerts. The ones below are dismissed as deliberate or time-based, not defects. Do not "fix" the first one into a standing bypass.

| Check | Score | Why it stays |
| --- | --- | --- |
| Branch-Protection | 8 | The top tier asks for two approvals. The organization has two members, so a PR has one reviewer who is not its author, and requiring two would block every merge unless a standing bypass existed. The `main` ruleset has an empty bypass list on purpose. Every other protection is on: a code-owner approval, approval of the last push, stale-review dismissal, an up-to-date branch, required checks, signed commits, and no force-push or deletion |
| Code-Review | 6 | The first commit landed before the `main` ruleset existed, because a ruleset cannot be applied to an empty repository. Every PR since needs a code-owner approval, so the approved share rises as PRs merge. The alert is dismissed only until the score reaches 10 |
| Maintained | 0 | Scorecard scores any repository under 90 days old as 0. This one was created on 2026-10-20, so it resolves itself in January 2027 |

The `lint` and `property` lanes of `verify.yml` also install packages (`eslint` and `fast-check`, with their dependencies). Both install with `--ignore-scripts` from a committed lockfile, hold read-only permissions and no secrets, and are Dependabot-tracked with a one-week cooldown. The scripts in `bin/` still use only the Node standard library.

The OpenSSF Best Practices badge is tracked at [project 15760](https://www.bestpractices.dev/projects/15760). It holds Passing, and the project is working toward Silver and Baseline 3. Gold stays out of reach for the two reasons in [`GOVERNANCE.md`](GOVERNANCE.md#gold-level-criteria-this-project-does-not-meet).
