# Customization report

Run 2026-10-22, adopt mode, inventory schema 6, Claude Code 2.1.308.

## Interview

| Question | Answer | Evidence |
| --- | --- | --- |
| Project kind | Claude Code plugin | Marketplace catalog, no TypeScript, no `exports`/`bin`/`main` |
| Runtime target | Node | `.node-version` 24, all scripts `.mjs` |
| Tests mandatory | Yes | `node --test` already runs in the required `verify` check |
| CI depth | Thorough | 11 workflows already present; nothing added or removed |
| Agents kept | Explore, code-reviewer, silent-failure-hunter | `test-author` and `code-implementer` assume `src/` and `tests/*.ts` |

## Step 0

The CLI's survey saw no TypeScript, scripts or harness and named no kind. The deep read established that `verify.yml` (four lanes plus an aggregate `verify` job) is the whole gate, that nothing is enforced locally, and that `.claude/CLAUDE.md` sits under `.claude/` on purpose because a root `CLAUDE.md` makes `claude plugin validate --strict .` warn. The staged baseline and all 11 staged packs passed the hash and structure checks.

## Round 1

| Area | Result |
| --- | --- |
| Conflicts | All five kept as they were: `README.md`, `.gitignore`, `package.json`, `.github/dependabot.yml`, `.github/workflows/dependency-review.yml` |
| Baseline additions | Harness subset only (see below); no TypeScript toolchain |
| Packs | `github` and `statusline` installed. `supply-chain`, `harness-extras`, `worktrees`, `claude-github`, `frontend`, `service`, `quality` declined or not applicable. `licensing` and `publishing` are fresh-only |
| Plugins enabled | claude-md-management, github, claude-security, security-guidance, plugin-dev |
| Plugins declined | context7, typescript-lsp, skill-creator, claude-code-setup, agent-sdk-dev, mcp-server-dev |
| Dependabot npm grouping | Not added: no root package, and the existing `npm` entries cover `.github/ci-tools` and `.github/deploy-tools` |

**Dropped**, each recorded in `.groundwork/adoption-decisions.json`:

| File | Reason |
| --- | --- |
| `.claude/agents/test-author.md`, `.claude/agents/code-implementer.md` | Writer spokes tied to `src/` and TypeScript tests |
| `.claude/hooks/guard-hub-src-writes.mjs` | Needs the writer-spoke roster |
| `.claude/hooks/guard-branch-isolation.mjs` | Guards `src/**` and `tests/**` on `main`; the `main` ruleset and `starting-work` cover it |
| `.claude/hooks/guard-protected-paths.mjs` | Protects `dist/` and `coverage/`, which do not exist here |
| `.claude/hooks/guard-js-extension.mjs`, `.claude/hooks/guard-no-commonjs.mjs` | TypeScript-project conventions |
| `.claude/hooks/post-edit-verify.mjs` | Runs prettier, eslint, tsc and vitest on `.ts` files |
| `.claude/hooks/inject-decision-gate.mjs` | Hub-and-spoke gate keyed to `src/` and `tests/` |
| `.claude/rules/*` | TypeScript and hub-and-spoke specific |
| `.claude/skills/typescript-guidance/**` | No TypeScript, so nothing for a sweep to amend |
| Root `CLAUDE.md` | Would make `claude plugin validate --strict .` warn |
| TypeScript toolchain files, `bin/verify.mjs`, `ci.yml`, `security-audit.yml` | The repo has no TypeScript or pnpm package |

## Needs a human read

Nothing is mechanically retargeted: every installed file was tailored by hand.

- `.claude/agents/code-reviewer.md`, `.claude/agents/silent-failure-hunter.md`: rewritten around fail-closed checks and shell hygiene instead of a typed error hierarchy.
- `.claude/skills/creating-prs/SKILL.md`, `.claude/skills/triaging-ci/SKILL.md`, `.claude/skills/starting-work/SKILL.md`, `.claude/skills/writing-commits/SKILL.md`: `pnpm verify`, `bin/verify.mjs`, `lefthook` and `src/` guards replaced with this repo's lanes, PR rules and `git commit -s`. These are the files most worth a read.
- `.claude/skills/harness-guidance/references/official-sources.md` is an upstream reference and was not edited.
- `.claude/skills/finishing-work/SKILL.md` mentions squash merges in passing; this repo merges with a merge commit. Left as written.

**Gates exercised:** `node --test` (26 pass), `node bin/check-catalog.mjs`, `claude plugin validate --strict .`, `shellcheck bin/*.sh`, JSON parse, and the docs-kit gate (with `docs/research/harness-refresh.md` added as intent-to-add, since the gate counts tracked files only). Each guard hook was fed a sample payload. The `smoke-install.sh` lane was **not exercised**: it clones every pinned plugin over the network.

## Round 2

| Sweep | Result |
| --- | --- |
| `harness-guidance` (refresh) | Five facets swept; no installed file invalid or deprecated. Tracker: `docs/research/harness-refresh.md`, `last-verified=2026-10-22`, Claude Code 2.1.308 |
| `typescript-guidance` | **Skipped**: not installed, repo has no TypeScript. No tracker written |

**Applied** (owner approved): `onFailure: "block"` on both Bash guards, `"if": "Bash(git push *)"` on `guard-git-push-signed`, exit 2 on an unparseable payload in `guard-secret-writes.mjs`, `omitClaudeMd: true` on `Explore.md`, and the unverified "Anthropic documents" attribution reworded.

**Deferred**, in the tracker's pending list: `NotebookEdit` in the secret guard's matcher, Bash-side read-only enforcement for the reviewers, secrets written through Bash, `disable-model-invocation` on the side-effecting skills, `permissions.ask` and `sandbox.enabled`.

**Where the findings disagreed with the baseline**

- The baseline registers `post-edit-verify`-style hooks with no `onFailure`; guidance since 2.1.295 offers `onFailure: "block"` to fail closed.
- Baseline `Edit(**/pnpm-lock.yaml)` and `yarn.lock` deny rules do not apply here; only `package-lock.json` was kept.
- The `Explore.md` claim that it skips `CLAUDE.md` is documented for the built-in only.
- Coverage: the CHANGELOG fetch returned the first 100k of about 1.07M characters, so nothing older than 2.1.281 was read.

## Grade

`bin/check-harness.mjs` (run from a temporary copy, since deleted): 30 structural checks passed, rubric 100% over 33 checks, `claude plugin validate` clean.

## Assumed, not answered

None. Every interview question was answered.

## Follow-ups for you

Run each once, and every collaborator who pulls this must too:

```bash
claude plugin install claude-md-management@claude-plugins-official --scope project
claude plugin install github@claude-plugins-official --scope project
claude plugin install claude-security@claude-plugins-official --scope project
claude plugin install security-guidance@claude-plugins-official --scope project
claude plugin install plugin-dev@claude-plugins-official --scope project
```

| Prerequisite | For |
| --- | --- |
| Python 3.9+ on `PATH` | `claude-security` |
| Python 3.8+ on `PATH` | `security-guidance` |
| `gh` authenticated | `github` pack skills |
| CodeQL default setup, or `supply-chain`'s `scorecard.yml` SARIF | `triaging-scan-alerts` returns nothing without code scanning |

Also: `security-guidance` and `claude-security` both ship hooks; check `/plugin` for a same-name hook notice. `security-guidance` spends tokens on every turn.
