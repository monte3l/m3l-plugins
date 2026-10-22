# Adoption report

Generated 2026-10-22T12:10:05.388Z by m3l-groundwork 1.1.0 (inventory schema 6).

**Mode:** adopt -- --adopt forced

## Codebase shape

- Not a TypeScript project: a plugin-marketplace **catalog** (`.claude-plugin/marketplace.json`) with no plugin code. Tooling is plain Node ESM (`bin/*.mjs`, `bin/lib/`, `design/source/docs-kit/`), `bash` (`bin/smoke-install.sh`) and `node:test` (`tests/*.test.mjs`, offline, no packages).
- `package.json` is a docs-kit manifest only: `private`, `homepage` (must equal the docs `siteUrl`), `repository`, `license`. No scripts, no dependencies, no `packageManager`. Packages exist only in `.github/ci-tools/` (pins Claude Code 2.1.303 by lockfile) and `.github/deploy-tools/` (pins wrangler), both npm with committed lockfiles.
- Node pin: 24 (`.node-version`), read by every workflow's `setup-node`.
- Kind evidence: no `exports`/`bin`/`main`, no framework deps, no plugin manifest at the root (`.claude-plugin/` holds `marketplace.json`, not `plugin.json`). None of the five baseline kinds fits exactly.
- Vendored: `design/` is an m3l-design release (`design/README.md`, `design/SHA256SUMS`), never hand-edited.

## Toolchain enforcement in effect

- Everything is enforced in CI, nothing locally: no git hooks, no formatter, no linter, no tsconfig.
- `verify.yml` lanes: `checks` (every tracked `*.json` parses via `jq`, `shellcheck bin/*.sh`, `node --test "tests/*.test.mjs"`, docs-kit `build.mjs --check`), `catalog` (`bin/check-catalog.mjs`: pins vs release tags and `plugin.json`), `plugin` (`claude plugin validate --strict .` and `bin/smoke-install.sh`), `dco` (every non-merge PR commit carries a matching `Signed-off-by`). An aggregate `verify` job requires explicit success from all four and is the required status check.
- Other workflows: `pins` (daily stale-pin issue plus a `release-published` dispatch that opens the bump PR), `docs`/`docs-live` (Cloudflare Workers deploy and a daily live-site drift check), `reuse`, `gitleaks`, `scorecard`, `dependency-review`, `workflow-lint` (actionlint + zizmor), `labeler`, `environments`. Dependabot covers github-actions and both npm tool directories.
- `main` ruleset requires signed commits (`CONTRIBUTING.md`).

## Toolchain grade

- **Wiring (structural):** no checks applied (nothing found, or nothing the grader could read).
- **Quality (rubric):** 0% over 5 checks -- advisory, never a blocker.
- **Drift from the baseline toolchain:** 1 identical, 2 divergent, 26 absent. Informational only -- `/customize` rewrites the baseline on purpose, so divergence is not a defect.

### Toolchain wiring findings

None.

### Toolchain quality findings (advisory)

- [toolchain-pin-shape] typescript -- is not declared in package.json
- [toolchain-pin-shape] eslint -- is not declared in package.json
- [toolchain-pin-shape] typescript-eslint -- is not declared in package.json
- [toolchain-pin-shape] @types/node -- is not declared in package.json
- [toolchain-pin-shape] package.json -- declares no packageManager, so the package-manager version is unpinned

## Existing Claude Code harness

Installed by `/customize`; see `.claude/CLAUDE.md` ("Harness") for the file-by-file table.

- Agents: Explore, code-reviewer, silent-failure-hunter (read-only).
- Skills: starting-work, writing-commits, creating-prs, finishing-work, triaging-ci, harness-guidance, plus the `github` pack's reviewing-dependabot-prs, triaging-scan-alerts, watching-pr-checks.
- Hooks: guard-git-push-signed, guard-double-background, guard-secret-writes, plus the `statusline` pack's three scripts. All guards are registered with `onFailure: "block"`.
- Rules: none. Commands: none. `settings.local.json`: absent.
- Plugins enabled: claude-md-management, github, claude-security, security-guidance, plugin-dev (all `@claude-plugins-official`).

## Harness grade

- **Wiring (structural):** no checks applied (nothing found, or nothing the grader could read).
- **Quality (rubric):** no checks applied.
- **Drift from the baseline harness:** 0 identical, 0 divergent, 32 absent. Informational only -- `/customize` rewrites the baseline on purpose, so divergence is not a defect.

### Wiring findings

None.

### Quality findings (advisory)

None.

## Human-facing docs & guidelines

- `README.md` and `CONTRIBUTING.md` are published as pages of the docs site; `SECURITY.md` and `design/README.md` too. Every tracked `.md` needs a `pages` or `exclude` entry in `docs.config.mjs`, or the docs gate fails.
- `CONTRIBUTING.md`: issue first, Conventional Commits, `git commit -s`, signed commits, `feat/ fix/ ci/ chore/ docs/` branches, merge commits, listing a plugin, moving a pin, removing or renaming a plugin.

## Baseline caps after a merge (approximate)

| Artifact | Installed | Cap |
| --- | --- | --- |
| Agents | 3 | 5 |
| Skills | 9 | 8 (over by one: 6 baseline including `harness-guidance` + 3 `github` pack) |
| Hooks | 6 | 10 |

## Available packs

### claude-github

- Modes: fresh, adopt
- Budget: 0 agent(s), 0 skill(s), 0 hook(s), 2 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: claude.yml only reacts to @claude mentions from a repository owner, member or collaborator (author_association), so an outside commenter on a public repository cannot start a job that holds contents: write and your auth secret. It also commits through the GitHub API (use_commit_signing) so a signed-commits ruleset accepts its work. claude-pr-review.yml runs on every non-bot, non-fork pull request, so it spends API credits on each push -- delete it and keep claude.yml if you only want on-demand help. Both workflows need one thing this pack cannot verify or install: an ANTHROPIC_API_KEY repository secret (the active default), or a CLAUDE_CODE_OAUTH_TOKEN from a Claude subscription, or a Workload Identity Federation setup in the Anthropic Console -- see the comments in .github/workflows/claude.yml for all three. An adopted project that already has its own .github/workflows/claude.yml or claude-pr-review.yml surfaces as an ordinary file conflict -- keep the existing one if it's already configured for that project's own auth choice, since this pack's version would just overwrite a working setup with its own generic defaults. The two workflows ship without an SPDX header on purpose (a header would carry a project-name token that stays literal in an adopt-mode install); a project that also installs `licensing` gets the headers from that pack's `check-license-headers.mjs --fix` backfill. These workflows used to ship inside the `github` pack; a project that installed that pack before the split keeps its files untouched.

### frontend

- Modes: fresh, adopt
- Budget: 1 agent(s), 1 skill(s), 0 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: Both files install anywhere a .claude/ directory exists and need no gate runner. ui-reviewer is a read-only review spoke (model claude-sonnet-5-5 at medium effort, tools Read, Grep and Glob only, so it never runs a command): nothing in the baseline's hub-and-spoke instructions dispatches it by name, so ask for it after changing UI, or add it to the project's own CLAUDE.md review step. It reviews source statically and cannot measure contrast, focus order or layout, so it reports those as NOT CHECKED instead of guessing. new-component ships no framework templates: it reads an existing sibling component to learn the project's layout, naming and test conventions, so it works best with at least one component already in the project (with none it stops and asks the owner which conventions to use), and it hands the writing to test-author and code-implementer, which an adopted project must keep for the skill to work as written.

### github

- Modes: fresh, adopt
- Budget: 0 agent(s), 3 skill(s), 0 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: The three skills need only `gh` CLI auth (already required by every other gh-CLI-based skill this baseline ships) and install anywhere a .claude/ directory exists. triaging-scan-alerts reads code-scanning alerts, and nothing in the baseline or this pack produces them: turn on GitHub's CodeQL default setup for the repository (Settings > Code security), or install the `supply-chain` pack, whose scorecard.yml uploads SARIF, otherwise the skill's first call returns "code scanning is not enabled" and reports nothing. watching-pr-checks' handoff to /triaging-ci degrades gracefully if the project doesn't have that skill installed -- it still reports the real failure, just without the handoff. The Claude Code GitHub Action workflows (claude.yml, claude-pr-review.yml) used to ship in this pack and are now the separate `claude-github` pack; a project that installed this pack before the split keeps those files untouched.

### harness-extras

- Modes: fresh, adopt
- Budget: 0 agent(s), 0 skill(s), 3 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: The compaction hooks install anywhere a .claude/ directory exists, but guard-readonly-bash.mjs imports ../../bin/lib/agent-roster.mjs (the baseline's list of writer spokes) -- copy that file alongside it in an adopted project, or skip that one hook. The PreCompact hook writes tmp/compact-handoff-<session_id>.json under the git worktree the session runs in (from the hook payload's cwd, since CLAUDE_PROJECT_DIR does not follow a session into a linked worktree) -- fresh mode's baseline .gitignore already lists tmp/ unconditionally, but an adopted project's own .gitignore was never touched by adopt mode, so add tmp/ there too before this pack's hooks run, or the handoff artifact can end up committed. The size-ratchet gate and the type-design-analyzer agent that used to ship here are now the separate `quality` pack. The status line that used to ship here is now the separate `statusline` pack, so installing this one never touches a project's own `statusLine` setting. guard-readonly-bash.mjs judges a read-only spoke's Bash command against an ALLOWLIST of read verbs (the baseline's own toolchain: pnpm, npm, eslint, prettier, tsc, vitest, knip, publint, attw, plus git subcommands for reading and the usual shell readers), so in an adopted project on yarn, make, jest or biome a read-only spoke is blocked from running those directly: have it call a package.json script (pnpm <script> and npm run <script> still pass) or add the verb to READ_ONLY_VERBS in the copied hook. A script file run through node or a package script is not inspected, so the guard raises the bar and proves nothing.

### licensing

- Modes: fresh
- Budget: 0 agent(s), 0 skill(s), 0 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- no bin/lib/verify-steps.packs.json found -- no bin/verify.mjs-shaped gate runner detected
- Adopt notes: REQUIRED right after install, before the first pnpm verify: `git add -A`, then `node bin/check-license-headers.mjs --fix`, then `git add -A` again and commit the result (the gate only checks git-tracked files, so a fresh project with nothing staged passes it vacuously and fails on every file at its first push) -- templates/core has never had a license-header gate before this pack, so every one of its own files (hooks, bin/ scripts, CI workflows, the placeholder src/tests, and the workflows of any other installed pack such as `claude-github` or `supply-chain`) is missing the SPDX header this pack's gate now requires. The shipped REUSE.toml and gate header use NOASSERTION as the license identifier because the pack cannot know the project's license: edit REUSE.toml and the headerLines() function in bin/check-license-headers.mjs once it is decided (a LICENSE file, if one exists, is the source of truth). In a hand-copied install the CLI does not substitute tokens, so replace every literal `__PROJECT_NAME__` in the copied files (REUSE.toml, the SPDX headers) with the project's real name first. Fresh mode only: the backfill fails an established project's pnpm verify until it has touched every file, so it is staged like every other pack (at .groundwork/packs/licensing/) but never auto-installed in adopt mode -- if an adopted project wants it, copy .groundwork/packs/licensing/files/ by hand, dropping the `.staged` suffix from every name (or copy templates/packs/licensing/files/ from this repo directly) and run the backfill above. The license-headers verify step is a lint-group gate and installs anywhere a bin/verify.mjs-shaped gate runner exists; wire it into the project's real one if it differs. REUSE.toml also carries globs for `.gitleaks.toml` and `.worktreeinclude`, the files the `supply-chain` and `worktrees` packs add, so the gate's uncovered-file check passes whether or not those packs are installed. This gate used to ship in the `publishing` pack; a project that installed that pack before the split keeps its files untouched.

| File | Differing keys |
| --- | --- |
| REUSE.toml | (whole file) |

### publishing

- Modes: fresh
- Budget: 0 agent(s), 0 skill(s), 0 hook(s), 1 workflow(s), 2 script(s)
- no .claude/settings.json found
- no bin/lib/verify-steps.packs.json found -- no bin/verify.mjs-shaped gate runner detected
- Adopt notes: REQUIRED right after install, before the first pnpm verify -- one step, or pnpm verify fails immediately, not from a real regression but from a setup gap this pack cannot close itself: `pnpm add -D @changesets/cli` -- the wiring contract only extends package.json's scripts, never its dependencies (see templates/packs/README.md), so the wired `changeset`/`version:packages` scripts reference a binary knip's own unlisted-binaries check correctly flags as missing until this is installed. In a hand-copied install the CLI does not substitute tokens, so replace every literal `__PROJECT_NAME__` in the copied files (the SPDX headers in bin/, the workflows) with the project's real name first. Fresh mode only: a release pipeline encodes decisions (whether the package is actually public, which registry, whether a GitHub App backs the version PR) this pack cannot survey or guess at safely, so it is staged like every other pack (at .groundwork/packs/publishing/) but never auto-installed in adopt mode -- if an adopted project wants it, copy .groundwork/packs/publishing/files/ by hand, dropping the `.staged` suffix from every name (or copy templates/packs/publishing/files/ from this repo directly) and work through the one-time setup below. check-publish-version.mjs is deliberately NOT one of this pack's wired verify steps: with changesets, package.json's version on the release branch is always the one just published between releases, so a version-already-published check running on every ordinary push (via pnpm verify / pre-push) would fail every single time until the next version PR lands -- it is instead invoked directly as a step inside release.yml's pack job, the one place "is this version about to collide with an already-published one" is actually the right question to ask. The remaining verify-group gate (dts-deps) installs anywhere a bin/verify.mjs-shaped gate runner exists; wire it into the project's real one if it differs. Both check-publish-version.mjs and check-dts-deps.mjs no-op (checked: 0, not a failure) on a package.json with `private: true` (the baseline's own default) or (check-dts-deps.mjs only) with no dist/**/*.d.ts yet -- flip `private` to `false` (and set a real `name`) once the package is actually meant to publish. The pack assumes a public package: `.changeset/config.json` ships `access: public`, npm refuses `restricted` for an unscoped name, and the publisher always requests provenance, which npm ties to a public source repository -- a private scoped package needs `access: restricted` and the `provenance: true` option removed from the libnpmpublish call in bin/npm-stage-publish.mjs. `@changesets/changelog-github` (and its `repo` option) is a drop-in swap for `.changeset/config.json`'s plain default changelog generator, once this project's GitHub repository is known, for changelog entries that link back to the originating PR/commit -- see `.changeset/README.md`. One-time setup before release.yml's first real run (distinct from the pnpm-verify prerequisite above), distilled from this repo's own .claude/rules/releases.md: (1) npm cannot configure a trusted publisher for a package that doesn't exist yet -- publish once by hand with a temporary token first; (2) the trusted publisher is bound to the exact workflow filename `release.yml` -- renaming or moving it breaks publishing until reconfigured on npmjs.com; (3) set the trusted publisher's allowed actions to staged-only (staged publishing only, npm's own default and recommendation since 2026-09-03) -- a maintainer runs `npm stage approve <id>` (2FA, never automatable) before a version actually installs; (4) create an `npm-publish` GitHub environment (via `gh api`, not committed as JSON) with a required reviewer, restricted to the release branch, so the `publish` job itself pauses before the git tag/Release/stage-publish exist; (5) if branch protection requires status checks on every PR with no bypass actor, the version-PR job needs a GitHub App installation token (`APP_CLIENT_ID`/`APP_PRIVATE_KEY` repo secrets), not the default GITHUB_TOKEN, or those checks never trigger and the PR can never merge -- if this project has no such rule, `github-token: ${{ secrets.GITHUB_TOKEN }}` is enough and the app-token step can be dropped. release.yml pins `tools/release/` (the exact libnpmpublish and npm-registry-fetch versions the publish job installs; it stages through them, not the npm CLI, because the CLI's bundled dependencies cannot be patched by an override) but the baseline's dependabot.yml only covers the github-actions ecosystem, so that pin goes stale unless you add an `npm` entry with `directory: "/tools/release"` to the project's own .github/dependabot.yml. The staged id to approve is printed by the workflow's "Show the staged ids to approve" step (and annotated on the run), and the `npm stage approve <id>` command is also written to the job summary. The secret-scanning and Scorecard workflows that used to ship here are now the separate `supply-chain` pack. The SPDX/REUSE license-header gate that used to ship here is now the separate fresh-only `licensing` pack: this pack's own scripts and release.yml still carry SPDX headers with a NOASSERTION license identifier, which is harmless without that gate but is what it would check.

### quality

- Modes: fresh, adopt
- Budget: 1 agent(s), 0 skill(s), 0 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- no bin/lib/verify-steps.packs.json found -- no bin/verify.mjs-shaped gate runner detected
- Adopt notes: check-file-budget.mjs's ROOTS default assumes a flat src/+tests/ layout and its ceilings are this baseline's defaults -- in an adopted project, re-point ROOTS at the project's real source layout (or drop the gate) before wiring it. check-file-budget.mjs imports ./lib/report.mjs, a baseline file that an adopted project will not have -- copy bin/lib/report.mjs alongside the gate, or treat the gate as not installable. The verify step assumes a bin/verify.mjs-shaped gate runner; if the project has none, install the agent and report the gate as not installable rather than inventing one. The type-design-analyzer agent has no such dependency and installs anywhere a .claude/agents/ directory exists; it is a read-only review spoke (model claude-opus-5-5 at xhigh effort, more expensive than the baseline's reviewers, which run claude-opus-5-5 at medium effort), and nothing in the baseline's hub-and-spoke instructions dispatches it by name -- ask for it after changing exported types, or add it to the project's own CLAUDE.md review step.

### service

- Modes: fresh, adopt
- Budget: 1 agent(s), 1 skill(s), 0 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: Both files install anywhere a .claude/ directory exists and need no gate runner. performance-analyzer is a read-only review spoke (model claude-sonnet-5-5 at medium effort, tools Read, Grep and Glob only, so it never runs a command): nothing in the baseline's hub-and-spoke instructions dispatches it by name, so ask for it after changing server code, or add it to the project's own CLAUDE.md review step. It reviews source statically and cannot profile or load-test, so it reports those as NOT CHECKED instead of guessing. api-doc ships an OpenAPI template (openapi-template.yaml, inside the skill directory) and reads the project's own route or handler code to learn what to document, so it works for any framework; it writes a docs file (docs/api/openapi.yaml by default) and never touches src/ or tests/, and it marks anything it cannot confirm from the code as TODO and unverified.

### statusline

- Modes: fresh, adopt
- Budget: 0 agent(s), 0 skill(s), 3 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: The statusline scripts read only the stdin payload, .git/HEAD (via node:fs, never a git subprocess) and process.availableMemory()/os.totalmem(), so they install anywhere a .claude/ directory exists -- no dependency on the baseline's file layout. The one real adopt risk is the two top-level settings keys: a project that already defines statusLine or subagentStatusLine collides, and its existing value must be shown and decided on, never overwritten -- if either is already set, skip that key and the script that renders it rather than failing the whole install; if both are set there is nothing left to install, so skip the pack. A statusLine in .claude/settings.local.json (or one passed with --settings) also shadows the project one; the user's own ~/.claude/settings.json ranks lower and does not -- check those before concluding the pack is wired. rate_limits.spend_limit and prompt_cache need Claude Code v2.1.251+, and the per-subagent model/contextWindowSize/effort fields need v2.1.205+/v2.1.214+, and the agentType label a row falls back to when a subagent has no name needs v2.1.293+; each renders only when present, so an older Claude Code degrades to fewer segments rather than breaking. The scripts behave the same on macOS and Linux; the memory segment uses process.availableMemory() (Node 22+), and on macOS with an older Node it is hidden rather than shown from os.freemem(), which undercounts there. Below roughly 40 columns the layout drops segments by priority rather than wrapping. These scripts used to ship inside the `harness-extras` pack; a project that installed that pack before the split keeps its files untouched.

### supply-chain

- Modes: fresh, adopt
- Budget: 0 agent(s), 0 skill(s), 0 hook(s), 2 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: An adopted project that already has its own .github/workflows/gitleaks.yml or scorecard.yml surfaces as an ordinary file conflict -- keep the existing one if it already works, since this pack's version would just replace a configured setup with its generic defaults. gitleaks.yml needs a free GITLEAKS_LICENSE repo secret for an organization-owned repository (gitleaks-action's own requirement); scorecard.yml assumes a public repository (`publish_results: true` needs one) -- set it `false` for a private repo. gitleaks.yml is read-only and scorecard.yml holds security-events: write and id-token: write in its analysis job; neither is a required check by default, so add either to branch protection once it has a clean run. The SPDX/REUSE license-header gate is not part of this pack: it lives in the fresh-only `licensing` pack, because it fails an established project's `pnpm verify` until a one-time backfill touches every file. The two workflows ship without an SPDX header on purpose (a header would carry a project-name token that stays literal in an adopt-mode install); a project that also installs `licensing` gets the headers from that pack's `check-license-headers.mjs --fix` backfill.

| File | Differing keys |
| --- | --- |
| .github/workflows/gitleaks.yml | (whole file) |
| .github/workflows/scorecard.yml | (whole file) |

### worktrees

- Modes: fresh, adopt
- Budget: 0 agent(s), 1 skill(s), 3 hook(s), 0 workflow(s), 0 script(s)
- no .claude/settings.json found
- Adopt notes: ensure-worktree-deps.mjs runs `pnpm install --frozen-lockfile --prefer-offline` automatically the first time a session starts inside a freshly created worktree with no node_modules yet -- this runs every dependency's lifecycle scripts the same way any `pnpm install` does, limited only by whatever `allowBuilds`/`onlyBuiltDependencies` policy the project's own pnpm config already sets (see typescript-guidance's pnpm supply-chain coverage if none is set). If node_modules in the worktree is a symlink (the usual result of `worktree.symlinkDirectories: ["node_modules"]` in .claude/settings.json, which this hook never reads), the hook detects the symlink and skips -- installing there would mutate the main checkout's own node_modules through the symlink. guard-worktree-only.mjs is registered with `"onFailure": "block"` (Claude Code 2.1.295 or later; an older version ignores the key), so a hook that cannot start, times out, exits with a code other than 0 or 2 or prints invalid JSON blocks the write instead of letting it through. A project that installed this pack before it carried that key has the same registration without it: /customize adds the missing key when it installs the pack again, and otherwise add `"onFailure": "block"` to that registration in .claude/settings.json by hand. It blocks every src/tests write outside a linked worktree under .claude/worktrees/, on any branch, for any caller (hub or writer spoke) -- this is stricter than guard-branch-isolation.mjs (which only blocks on main) and guard-hub-src-writes.mjs (which blocks the hub and any non-writer subagent); confirm the team actually wants every change routed through a worktree before installing this pack, since it changes the day-to-day workflow, not just adds a nicety. `.claude/worktrees/` should already be gitignored (the baseline's own .gitignore covers this); if adopting into a project with a hand-rolled .gitignore that doesn't, add it before installing. repair-core-bare.mjs resets `core.bare = true` to `false` in a non-bare repo's shared .git/config at session start and after EnterWorktree/ExitWorktree/Agent calls: Claude Code's worktree tools have been reported to leave it set (anthropics/claude-code#58345, #69802: user bug reports, both since closed as not planned, so whether it still reproduces is unconfirmed), which breaks `git status` in the main checkout. It only acts on a provably non-bare repository (its common git dir is named .git and contains an index), never on a genuine bare repo -- including a bare clone stored in a directory called .git -- and reports a failed repair on stdout rather than silently.

## What groundwork would change

## What groundwork changed

- Added: 3 agents, 3 hooks, 6 baseline skills (including `harness-guidance` and its reference), `.claude/settings.json`, `bin/lib/signed-range.mjs`, `docs/research/harness-refresh.md`; `docs.config.mjs` excludes `docs/research/**`; `.claude/CLAUDE.md` gained a "Harness" section.
- Packs installed: `github` (3 skills), `statusline` (3 scripts, two settings keys). `licensing` and `publishing` are fresh-only and were not installed.
- Conflicts: `README.md`, `.gitignore`, `package.json`, `.github/dependabot.yml`, `.github/workflows/dependency-review.yml` all kept as they were.
- Not installed, with reasons: see `.groundwork/customization-report.md`.

## Could not be determined

- Nothing left undetermined by the deep read.

## Next step

Read `.groundwork/customization-report.md` for what `/customize` changed, what was dropped and why, and what still needs a human.
