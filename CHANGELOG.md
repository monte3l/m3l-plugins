# Changelog

This repository publishes no releases. The catalog is the product: every change to `.claude-plugin/marketplace.json` takes effect for users as soon as it lands on `main`, so each pin bump is recorded here.

## Unreleased

- Catalog for the `monte3l` marketplace, listing `m3l-groundwork-customize` at `@monte3l/groundwork@1.0.5` and `m3l-prompt-optimizer` at `m3l-prompt-optimizer--v1.0.0`.
- `bin/check-catalog.mjs`, `bin/bump-pins.mjs` and `bin/smoke-install.sh`.
- Repository baseline, design system `v1.1.0` (vendored tier) and a docs site at plugins.monte3l.com.
- Sources use full HTTPS URLs (`url` and `git-subdir`), not the `github` type or `owner/repo` shorthand, which clone over SSH and fail without a GitHub key. `bin/check-catalog.mjs` enforces it, and validates the values it puts in a URL.
- `SECURITY.md` records the accepted OpenSSF Scorecard findings.
- Unit tests for the catalog checks in `tests/`, run by `verify`, and a test policy in `CONTRIBUTING.md`.
- Listed `m3l-output-governor` at `m3l-output-governor--v1.0.0`.
- The `Pins` workflow opens a pull request when a plugin repository dispatches `release-published`: `bin/bump-for-release.mjs` checks the repository is listed, runs `bin/bump-pins.mjs --apply --only <owner/repo>` and records the CHANGELOG line, and the workflow commits it as the release App so it is signed. The daily issue stays as the safety net.
- `bin/bump-pins.mjs --apply` also copies the new pin's `plugin.json` description into the entry, because `bin/check-catalog.mjs` requires them to be equal and the first automated pin pull request failed that check. A pin pull request closed without merging no longer blocks the next dispatch for the same release.
- Moved `m3l-prompt-optimizer` to `m3l-prompt-optimizer--v1.1.0`, and its description to match `plugin.json`.
- Moved `m3l-groundwork-customize` to `@monte3l/groundwork@1.1.0`.
- `verify` gates `bin/` at 80% statement, branch and function coverage, lints the JavaScript with ESLint (`.github/dev-tools/`), and runs fast-check property tests of the parsers (`tests/property/`). `bin/check-catalog.mjs` and `bin/bump-pins.mjs` keep their logic in `bin/lib/catalog.mjs` so the tests can reach it.
- `parseLsRemote` skips a line that is not `<sha><tab><ref>`, and a dispatch payload whose `repository` is an object no longer throws in `validateDispatch`. Both were found by the property tests.
- `GOVERNANCE.md`, `ROADMAP.md`, `docs/architecture.md` and `docs/assurance-case.md`, and a fuller `SECURITY.md` (support scope, response process, remediation thresholds, an accurate secrets inventory) and `CONTRIBUTING.md` (setup, coding standards, review, dependencies, account security), toward the OpenSSF Best Practices Silver badge and Baseline 3.
