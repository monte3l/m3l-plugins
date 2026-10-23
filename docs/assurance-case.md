# Security assurance case

This is the argument that `m3l-plugins` is secure enough for what it does, and the evidence for each step. It is the project's answer to the OpenSSF criteria `assurance_case`, `implement_secure_design`, `know_secure_design` and `know_common_errors`, and to Baseline `OSPS-SA-03`. It is kept short on purpose: this project is a catalog with a few small scripts, so the claims are few.

**The top-level claim:** a user who installs a plugin from this marketplace gets the code at the commit that plugin's own release tag named when the catalog entry was reviewed, and nothing a third party could add since.

## Threat model

The asset is the integrity of `.claude-plugin/marketplace.json` on `main`. Whoever controls it controls which code Claude Code users install. Confidentiality is not at stake: the repository and the catalog are public, and no user data passes through them.

| Threat | How it would work | Control | Where to check |
| --- | --- | --- | --- |
| A pin points at the wrong commit | A typo, or a pull request that sets `sha` to a different commit | `check-catalog.mjs` re-resolves the tag with `git ls-remote` and fails unless it equals `sha`. It is part of the required `verify` check | `bin/lib/catalog.mjs`, `tests/catalog.test.mjs` |
| A tag is moved after review | The plugin repository force-moves a tag | The pin holds the commit, not just the tag, so a moved tag fails `check-catalog` and never changes what installs. The `tags` ruleset on this repository forbids moving its own | `ref` and `sha` in the catalog |
| A pin points at a repository outside the organization | A pull request adds a third-party source | `check-catalog` requires the owner to be `monte3l`, and a full `https://github.com/` URL | `checkCatalog` |
| A forged `release-published` dispatch | Anyone able to dispatch names a repository | The payload only names a listed repository. The ref and sha come from `git ls-remote`, and a person merges the pull request | `validateDispatch`, `bump-for-release.mjs` |
| A hostile payload value | An object or control characters in `repository` | The slug must match `^monte3l/[A-Za-z0-9._-]+$`, and anything printed is truncated to printable ASCII. Found and fixed by the property tests | `tests/property/`, `tests/dispatch.test.mjs` |
| A hostile value ends up in a URL | A crafted `sha`, owner or path reaches `raw.githubusercontent.com` | `fetchManifest` allow-lists each part and rejects `..` | `fetchManifest`, `tests/catalog.test.mjs` |
| A malicious change merges | A compromised or careless account | Two-person review with no bypass, signed commits, two-factor authentication for the organization, required checks | `main` ruleset, `GOVERNANCE.md` |
| CI is turned against the repository | Template injection, a pinned action replaced, a leaked token | Per-job permissions, `persist-credentials: false`, every action pinned to a SHA, values passed through `env:`, zizmor and actionlint on every change | `.github/workflows/`, `workflow-lint.yml` |
| A secret leaks | A token committed or logged | Secret scanning with push protection, gitleaks on every push and pull request, narrow secret scope. The inventory is in `SECURITY.md` | `SECURITY.md#secrets-and-credentials` |
| A dependency of the CI tools is compromised | A malicious version of `eslint`, `fast-check`, `wrangler` or Claude Code | Exact versions and integrity hashes in committed lockfiles, a cooldown on Dependabot bumps, `--ignore-scripts` on all but one lane, read-only tokens and no secrets in the lanes that install | `.github/dependabot.yml`, `verify.yml` |

## Trust boundaries

The boundaries are drawn in [`architecture.md`](architecture.md#trust-boundaries). The ones that matter most: the plugin repositories are **trusted but verified**, because the catalog only ever takes a tag and a commit from them and re-checks both. GitHub, Cloudflare and Claude Code are **trusted infrastructure**. A contributor without access is **untrusted**, and can only open an issue.

## Secure design principles applied (Saltzer and Schroeder)

| Principle | How it shows up here |
| --- | --- |
| Economy of mechanism | `bin/` is a few hundred lines of Node standard library. There is no server, no database and no runtime dependency |
| Fail-safe defaults | Every lookup that throws is reported as a problem, never swallowed. `verify` needs an explicit `success` from every lane, so a skipped or cancelled lane fails closed |
| Complete mediation | The `main` ruleset applies to every change, the maintainers included. The bypass list is empty |
| Open design | The repository, the scripts, the policies and this document are public. Nothing depends on obscurity |
| Separation of privilege | A change needs an author, a different approver, signed commits and passing checks. Moving a pin needs a person to merge, even when automation opened the pull request |
| Least privilege | Workflows start from `permissions: {}`. The App token for pins is scoped to one repository and two permissions, and the deploy and cleanup jobs run in environments restricted to `main` |
| Least common mechanism | Four separate install directories (`.github/ci-tools`, `.github/deploy-tools`, `.github/dev-tools` and `tests/property`), each with its own lockfile, so one tool's tree never widens another's |
| Psychological acceptability | One command per check, documented in the README, and the same commands run locally and in CI |

## Common implementation weaknesses countered

| Weakness | Where it could occur | Mitigation |
| --- | --- | --- |
| CWE-20, improper input validation | The dispatch payload, `git ls-remote` output, catalog fields | `validateDispatch`, `parseLsRemote` skipping malformed lines, `entryProblems`, and property tests that feed each of them arbitrary input |
| CWE-22, path traversal | The plugin manifest path in `fetchManifest` | The path must match `^(?:[A-Za-z0-9._@-]+/)*\.claude-plugin/plugin\.json$` and may not contain `..` |
| CWE-78, OS command injection | `git ls-remote` and the scripts the workflows run | `execFileSync` with an argument array, never a shell string. Workflow values reach `run:` only through `env:` |
| CWE-94, code injection in CI | Template expansion in workflows | zizmor reports none. No workflow interpolates event data into a script |
| CWE-200, exposure of sensitive information | Logs and error messages | A refusal reason shows only the first 80 printable characters of a value, and no secret is ever written to a log |
| CWE-494, download of code without integrity check | Installing plugins and CI tools | The plugin pin holds a full commit SHA. The CI tools are installed from lockfiles with integrity hashes |
| CWE-918, server-side request forgery | `fetchManifest` builds a URL from catalog data | The host is fixed, and every variable part is allow-listed first. CodeQL's `js/file-access-to-http` alert on this was dismissed as a false positive with that reason recorded |
| CWE-829, inclusion of functionality from an untrusted source | Third-party actions | Every action is pinned to a commit SHA, and Dependabot proposes bumps after a cooldown |

## Residual risks

- **A compromised plugin repository** that publishes a malicious release under a new tag. The pin review is the control: a person reads the diff of the catalog, but not the plugin's code. Each plugin's own repository carries its own checks.
- **Two accounts** are enough to merge any change. The organization requires two-factor authentication, and the ruleset requires signed commits, but a compromise of both owners defeats the review control.
- **The `plugin` lane installs Claude Code with its install script**, because the script fetches the native binary. It holds read-only permissions and no secrets, and the package is pinned by integrity hash. This is recorded as an accepted risk in [`SECURITY.md`](../SECURITY.md).
- **Organization secrets reach every workflow in this repository**, not only the job that names them. The Cloudflare and App secrets are organization secrets shared with selected repositories, so a malicious change to a workflow could read them. Required review of every workflow change is the control, and `SECURITY.md` records it.
- **GitHub and Cloudflare** are trusted. An outage or compromise of either is outside what this project can prevent.
