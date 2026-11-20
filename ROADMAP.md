---
reviewed: 2026-11-20
---

# Roadmap

What this project intends to do, and not do, over roughly the next year. It lists what is still ahead. What has shipped is in the git history and [`CHANGELOG.md`](CHANGELOG.md). Work that can be closed is a GitHub issue, linked from here. What stays true until something changes is written here, so it survives outside any one tool. The rule for which goes where is the org's [tracking policy](https://github.com/monte3l/.github/blob/main/blueprint/tracking.md).

## Now

- Keep every listed plugin's pin current. The `Pins` workflow opens a pull request when a plugin repository publishes a release, and a daily run opens an issue for any pin it missed.
- Hold the quality gates: 80% coverage of `bin/`, ESLint, the property tests, and every required check on `main`.

## Next 12 months

- **List more `monte3l` plugins** as their repositories reach a tagged release. Each needs the checks in [`CONTRIBUTING.md`](CONTRIBUTING.md#listing-a-plugin).
- **Move the Cloudflare and janitor secrets into their environments.** Tracked in [#60](https://github.com/monte3l/m3l-plugins/issues/60). Today all seven secrets are organization secrets, so any workflow in the repository can read them. As environment secrets of `docs-cloudflare` and `env-janitor`, only a job running on `main` in that environment could. See [`SECURITY.md`](SECURITY.md#storing).

## Known limits

- **One person authors changes.** The second owner approves every change today. What is missing is a second person who also authors changes and can run the pin workflow alone. There is no committed date. See [`GOVERNANCE.md`](GOVERNANCE.md#gold-level-criteria-this-project-does-not-meet).
- **Two Scorecard checks are low until time passes.** `Maintained` is expected to clear once the repository is 90 days old, in January 2027, and `Code-Review` rises as reviewed changes outnumber the first commit. Nothing to do but wait.
- **The `verify.yml` lane runs an install script.** The lane that installs `@anthropic-ai/claude-code` runs its install script, because that script fetches the native binary. It is an accepted risk. Re-check it each time Anthropic changes how the package installs: if a release makes the script unnecessary, the lane moves to `--ignore-scripts` like the other lanes.

## Unverified

| Claim | Source | Date |
| ----- | ------ | ---- |
| Scorecard's `Maintained` check clears once the repository is 90 days old | Carried over from the previous roadmap. The Scorecard checks documentation was not re-read for this change | 2026-11-20 |

## What this project will not do

- **Hold plugin code.** The catalog points at each plugin's own repository, pinned to a tag and commit.
- **Follow a branch.** A pin is always a release tag and its full commit SHA.
- **Publish its own releases.** The catalog is consumed from `main`. A release would add process and no assurance the pin checks do not already give.
- **Take a live dependency on `m3l-design`.** The design system is copied, on purpose.
