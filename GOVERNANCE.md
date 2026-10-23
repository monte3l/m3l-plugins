# Governance

**In short:** two people hold every right over this repository, and one of them writes nearly everything. No change reaches `main` without the other's approval, and no one can bypass that. This document says who decides what, who may get access, what happens if someone becomes unavailable, and which Gold-level badge criteria the project does not meet.

The model is a **small-team, owner-run** one: no board and no vote. It exists to satisfy the [OpenSSF Best Practices](https://www.bestpractices.dev/projects/15760) Silver criteria `governance`, `roles_responsibilities` and `access_continuity`, and Baseline `OSPS-GV-01` and `OSPS-GV-04`. It also records, in plain terms, the Gold criteria this project cannot meet.

## Decision-making

- **Day-to-day changes** (a pin bump, a docs fix, a CI change) are proposed as a pull request by one owner and approved by the other. The `main` ruleset requires one approval from a code owner who is not the author, approval of the last push, resolved review threads, signed commits and the required checks. Its bypass list is empty, so nobody can skip any of it.
- **Larger changes** (a new plugin, a change to what `bin/check-catalog.mjs` enforces, a change to a workflow's permissions) are discussed in an issue first, so the reasoning is public and searchable.
- **Listing or removing a plugin** follows [`CONTRIBUTING.md`](CONTRIBUTING.md#listing-a-plugin). A listed plugin is never renamed.
- **Disputes.** The two owners decide together. If they disagree, the change does not merge: the ruleset needs both. A contributor who disagrees with a decision can reopen it in the issue.
- **Security decisions** (triaging a report, accepting or dismissing a Scorecard finding) follow [`SECURITY.md`](SECURITY.md).

If one owner is unavailable, the other cannot merge their own pull request. The only way around that is to switch the ruleset to `disabled` and back, which GitHub logs, and which is reserved for the emergency in "Access continuity".

## Roles

| Role | Held by | Responsibilities |
| --- | --- | --- |
| **Owner and maintainer** | [Enrico Lionello](https://github.com/enri3l) (`enri3l`) | Writes most changes, triages issues, makes design decisions, holds admin on the repository and ownership of the `monte3l` organization |
| **Owner and reviewer** | [Giulia Montevecchi](https://github.com/giulmonte) (`giulmonte`) | Approves and merges pull requests, holds the same admin and ownership rights, and is the code owner who approves the maintainer's changes |
| **Security contact** | Both owners | Receive reports through [private vulnerability reporting](SECURITY.md#reporting-a-vulnerability) and follow the [response process](SECURITY.md#response-process) |
| **Contributor** | Anyone opening an issue | Follows [`CONTRIBUTING.md`](CONTRIBUTING.md). Pull requests are limited to collaborators, so an issue is the contribution |

`.github/CODEOWNERS` lists both owners for every path. This repository publishes no releases, so there is no release-approver role: a pin reaches users when its pull request merges.

## Granting access

This covers **write or admin access to this repository, membership of the `monte3l` organization, and any credential** from the inventory in [`SECURITY.md`](SECURITY.md#secrets-and-credentials). Write access counts as access to secrets, because a workflow run from a branch can reach them.

- **Who decides.** Only an organization owner grants access, and the other owner agrees first. No automation grants or widens it.
- **Review before the grant.** Both checks happen, and neither is skipped:
  - **Track record.** A history of accepted contributions through issues, or in another project the owners can look at.
  - **Identity.** The account has two-factor authentication on, and an owner has confirmed who the person is through a channel outside GitHub, such as an employer or another project's maintainer list. The issue that proposes the access records which check was used.
- **Least privilege.** Access starts at `triage`, moves to `write` after accepted contributions, and to `admin` or ownership only for a co-maintainer, which repeats both checks for the wider scope.
- **Secrets.** No credential is shared with a collaborator in a message or a file.
- **Revocation.** Either owner can remove access at any time and tells the other afterwards. Access is reviewed at least once a year, and a collaborator inactive for 12 months is reduced to `triage` or removed.

Today the only people with access are the two owners above. The record for each future grant is the issue that proposed it.

## Related repositories

This project is one repository. It holds no plugin code.

| Repository | What it is | Reaches users through this project? |
| --- | --- | --- |
| [`monte3l/m3l-groundwork`](https://github.com/monte3l/m3l-groundwork) | Bootstrapper and the `m3l-groundwork-customize` plugin. Its `environments.yml` planner is also checked out here at a pinned commit | The plugin, as a pin in the catalog |
| [`monte3l/m3l-prompt-optimizer`](https://github.com/monte3l/m3l-prompt-optimizer) | The `m3l-prompt-optimizer` plugin | As a pin in the catalog |
| [`monte3l/m3l-output-governor`](https://github.com/monte3l/m3l-output-governor) | The `m3l-output-governor` plugin | As a pin in the catalog |
| [`monte3l/m3l-design`](https://github.com/monte3l/m3l-design) | The design system | As a verbatim vendored copy under `design/`, used for the docs site only |
| [`monte3l/.github`](https://github.com/monte3l/.github) | Organization defaults, including the code of conduct and the repository baseline script | No. Its script only checks this repository's settings |

Each plugin is a separate product with its own repository, maintainers' checks and security policy. A vulnerability in one belongs in that repository.

## Access continuity

If one owner becomes unavailable, the other must still be able to triage, merge and respond to a report within about a week. Two things make that true today:

- **Both owners hold GitHub administration independently.** Either can manage the `main` ruleset, the organization's secrets and the two GitHub App installations (`monte3l-release`, `monte3l-env-janitor`) without the other.
- **The `main` ruleset requires signed commits, not a particular key.** Signing is configured per machine, so a lost key blocks commits only until its owner configures a new one.

Beyond that, each owner keeps an **emergency access kit** for their own accounts: recovery codes, and a backup and revocation certificate for their signing key, held in a password manager's emergency-access feature or an equivalent sealed offline copy. The kit and its executor are not described here, because naming a person or storing a secret in a public repository would defeat the purpose. Recovery uses GitHub's ordinary account-recovery flows and `gh api` calls against the ruleset, both already documented.

This satisfies `access_continuity`, which allows a small project to rely on keys held offline rather than a larger team.

## Bus factor

Today's bus factor is **1**, stated plainly. Both owners have full access and one of them approves every change, but one person has written all of them: 14 of 14 merged pull requests were authored by `enri3l` (or by the release App on their behalf) and approved by `giulmonte`. Growing past 1 means the second owner also authoring changes and driving the pin workflow alone. It is on the [roadmap](ROADMAP.md).

## Gold-level criteria this project does not meet

Two Gold criteria cannot honestly be met today. Each is recorded **Unmet** in `.bestpractices.json`.

- **`bus_factor`** needs two or more people who can run the project. See above.
- **`contributors_unassociated`** needs at least two significant contributors who are not affiliated with the same organization. Both people with access belong to `monte3l`, so more contribution from either leaves it Unmet. It needs a significant contributor from outside the organization.

`two_person_review` is **Met**: the ruleset requires an approval from someone other than the author, and the recent history carries one on every merged pull request.

`signed_releases` is not applicable, because the repository publishes no releases. `version_tags_signed` is **Unmet**, because the criterion only allows Met or Unmet, and it is only suggested: the repository creates no tags to sign. Every plugin pin is a tag in the plugin's own repository, checked by `bin/check-catalog.mjs`.

Closing the first two means onboarding a second active maintainer and an outside contributor, not a code or process change. See [`ROADMAP.md`](ROADMAP.md).
