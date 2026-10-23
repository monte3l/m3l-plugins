# Roadmap

What this project intends to do, and not do, over roughly the next year. It is a file, not an issue board, so it survives outside any one tool. It lists what is still ahead. What has shipped is in the git history and [`CHANGELOG.md`](CHANGELOG.md).

## Now

- Keep every listed plugin's pin current. The `Pins` workflow opens a pull request when a plugin repository publishes a release, and a daily run opens an issue for any pin it missed.
- Hold the quality gates: 80% coverage of `bin/`, ESLint, the property tests, and every required check on `main`.

## Next 12 months

- **List more `monte3l` plugins** as their repositories reach a tagged release. Each needs the checks in [`CONTRIBUTING.md`](CONTRIBUTING.md#listing-a-plugin).
- **Grow the bus factor past 1.** The second owner approves every change today. What is missing is a second person who also authors changes and can run the pin workflow alone. No committed date. See [`GOVERNANCE.md`](GOVERNANCE.md#gold-level-criteria-this-project-does-not-meet).
- **Close the Scorecard gaps that time closes.** `Maintained` clears once the repository is 90 days old, in January 2027, and `Code-Review` rises as reviewed changes outnumber the first commit.
- **Move the Cloudflare and janitor secrets into their environments.** Today all seven secrets are organization secrets, so any workflow in the repository can read them. As environment secrets of `docs-cloudflare` and `env-janitor`, only a job running on `main` in that environment could. See [`SECURITY.md`](SECURITY.md#storing).
- **Re-check the accepted risk in `verify.yml`** each time Anthropic changes how `@anthropic-ai/claude-code` installs. The lane runs its install script today because that script fetches the native binary. If a release makes that unnecessary, the lane moves to `--ignore-scripts` like the other lanes.

## What this project will not do

- **Hold plugin code.** The catalog points at each plugin's own repository, pinned to a tag and commit.
- **Follow a branch.** A pin is always a release tag and its full commit SHA.
- **Publish its own releases.** The catalog is consumed from `main`. A release would add process and no assurance the pin checks do not already give.
- **Take a live dependency on `m3l-design`.** The design system is copied, on purpose.
