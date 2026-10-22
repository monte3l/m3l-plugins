# Harness refresh tracker

<!-- harness-refresh: last-verified=2026-10-22 claude-code-version=2.1.308 -->

Living record of `harness-guidance` (refresh mode) sweeps — the per-facet,
per-source state a run diffs against, so each sweep reports what
**changed** since the last one instead of rediscovering the whole `.claude/`
surface from scratch. Updated **in place** on every run, never as a new
dated file.

First sweep run 2026-10-22 by `/customize` (Round 2). Coverage note: the
Claude Code CHANGELOG fetch returns only the first ~100k of ~1.07M characters,
so the oldest version read per facet was 2.1.295 (hooks, settings), 2.1.286
(models), 2.1.281 (agent design) and 2.1.295 (skills). Entries older than that
were **not** read; do not treat anything before 2.1.281 as covered.

## Outstanding drift

No installed file is invalid, deprecated or stale. Applied 2026-10-22 (owner
approved): `onFailure: "block"` on both Bash guards, `"if": "Bash(git push *)"`
on `guard-git-push-signed`, exit 2 on an unparseable payload in
`guard-secret-writes.mjs`, `omitClaudeMd: true` on `Explore.md`, and the
unverified "Anthropic documents" attribution reworded. Still pending (deferred
by the owner, not defects):

| Item | Facet | Affects | Kind |
| --- | --- | --- | --- |
| Match `Write\|Edit\|NotebookEdit` for the secret guard | hooks | `.claude/settings.json` | Hook behaviour, deferred |
| Secrets written through Bash (`echo X > .env`, heredocs) are not guarded | hooks | `.claude/hooks/guard-secret-writes.mjs` | Gap, not raised for a decision |
| Reviewers are read-only by prompt only (Bash is granted); a `PreToolUse` hook or `permissions.deny` would enforce it | agents | `.claude/agents/code-reviewer.md`, `.claude/agents/silent-failure-hunter.md` | Deferred |
| Side-effecting skills are model-invocable; `disable-model-invocation: true` would stop auto-triggering | skills | creating-prs, writing-commits, finishing-work, reviewing-dependabot-prs | Owner trade-off, left as shipped |
| `permissions.ask` for `Bash(git push *)` and `sandbox.enabled` are available | settings | `.claude/settings.json` | Design decision, not raised |

## Facet state

| Facet                        | Last verified | Notes |
| ---------------------------- | ------------- | ----- |
| `models-tiering`             | 2026-10-22    | `claude-haiku-5-5` (retirement not before 2027-10-07) and `claude-opus-5-5` (not before 2027-09-22) active; `effort: medium` valid and the Opus 5.5 default. Deprecated elsewhere: `claude-sonnet-4-5-20250929` (2026-11-30), `claude-haiku-4-5-20251001` (not before 2026-10-15). A project `Explore` with `model: haiku` is the documented way to run Explore cheaply |
| `cc-features-settings`       | 2026-10-22    | `onFailure` (2.1.295+), `statusLine`, `subagentStatusLine`, `enabledPlugins`, deny syntax all current. `Write(...)` path rules are never consulted; use `Edit(...)`. `$schema` may lag newer keys. Settings reference read only ~25% |
| `agent-subagent-design`      | 2026-10-22    | All frontmatter fields valid; override of built-in `Explore` supported by `name`. `disallowedTools: Agent` redundant but harmless. Sub-agents page tail not read |
| `skills-context-engineering` | 2026-10-22    | Frontmatter valid; description plus `when_to_use` truncated at 1,536 characters in the listing, 1,024 in the platform spec; bodies under 500 lines (largest 248). `.claude/CLAUDE.md` is a valid location |
| `hooks-lifecycle`            | 2026-10-22    | `PreToolUse`, matchers, stdin fields, exit 2 plus stderr all current and not deprecated. Top-level `decision` is deprecated for `PreToolUse` (not used here). Hooks page read to ~200k of 273k characters. Unconfirmed: whether `PreToolUse` fires inside subagents |
