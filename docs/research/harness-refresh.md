# Harness refresh tracker

<!-- harness-refresh: last-verified=2026-11-04 claude-code-version=2.1.318 -->

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

Second sweep run 2026-11-04. The changelog delta 2.1.309 to 2.1.318 was read in
full (2.1.313 and 2.1.315 were never released), so coverage is continuous from
2.1.309 to 2.1.318.

## Outstanding drift

No installed file is invalid or deprecated. Applied 2026-10-22 (owner approved):
`onFailure: "block"` on both Bash guards, exit 2 on an unparseable payload in
`guard-secret-writes.mjs`, `omitClaudeMd: true` on `Explore.md`.

Applied 2026-11-04:

- Removed `"if": "Bash(git push *)"` from `guard-git-push-signed`. The `if` filter
  is best-effort and matches the command as written, so `git -C . push` and
  `/usr/bin/git push` never reached the script, which already parses both. This
  corrected a regression from the 2026-10-22 round.
- `code-reviewer.md`: the ~2,000-token cap is now described as this project's own
  cap, not "the sub-agent output band Anthropic documents" (the sub-agents page
  states no output-size band).
- `Explore.md`: the `omitClaudeMd` wording now claims only what the field drops
  (project and user `CLAUDE.md`), not parent git status or a model-tier link.
- `Explore.md`: added `effort: medium`. Since 2.1.317 a subagent on a different
  model from the session uses its own model's saved effort, not the session's.

Still pending (deferred by the owner, not defects):

| Item | Facet | Affects | Kind |
| --- | --- | --- | --- |
| Match `Write\|Edit\|NotebookEdit` for the secret guard. Adding `NotebookEdit` alone does nothing: the hook reads only `file_path`, and the notebook field name is undocumented | hooks | `.claude/settings.json`, `.claude/hooks/guard-secret-writes.mjs` | Hook behaviour, deferred |
| Secrets written through Bash (`echo X > .env`, heredocs) are not guarded. The hooks guide suggests a `Stop` hook or a `git status --porcelain` scan | hooks | `.claude/hooks/guard-secret-writes.mjs` | Gap, not raised for a decision |
| Reviewers are read-only by prompt only (Bash is granted). Now enforceable via agent-frontmatter `hooks:` (a `PreToolUse` Bash validator; needs folder trust, so not in `-p` runs) or a settings hook keyed on `agent_type` | agents | `.claude/agents/code-reviewer.md`, `.claude/agents/silent-failure-hunter.md`, `.claude/agents/Explore.md` | Deferred |
| Side-effecting skills are model-invocable; `disable-model-invocation: true` would stop auto-triggering | skills | creating-prs, writing-commits, finishing-work, reviewing-dependabot-prs | Owner trade-off, left as shipped |
| `permissions.ask` for `Bash(git push *)` (now the docs' example, same text-matching limit as `if`), `permissions.blockWritesOutsideWorkingDirectories` (2.1.314) and `sandbox.enabled` are available | settings | `.claude/settings.json` | Design decision, not raised |

Caveat to know: with no managed settings and no Team or Enterprise `/login` (an
API key or `CLAUDE_CODE_OAUTH_TOKEN` counts as none), an installed mod that
handles `tool.check` can approve a call that a deny rule or a `PreToolUse` hook
blocked. The guards and deny rules here are not absolute on a personal login
once a mod is installed.

## Facet state

| Facet                        | Last verified | Notes |
| ---------------------------- | ------------- | ----- |
| `models-tiering`             | 2026-11-04    | `claude-haiku-5-5` (retirement not before 2027-10-07) and `claude-opus-5-5` (not before 2027-09-22) active; `effort: medium` valid and the default on both. `claude-sonnet-4-5-20250929` deprecated, retires 2026-11-30 (replacement `claude-sonnet-5-5`). `claude-haiku-4-5-20251001` is **Active**, not deprecated: its not-before date (2026-10-15) passed with no notice. Opus 4.8 fast mode removed 2026-11-30 (unused here). `CLAUDE_CODE_SUBAGENT_EFFORT` (2.1.316) is undocumented on the env-vars page. Models overview moved to `platform.claude.com/docs/en/models/overview`; the old URL still loads |
| `cc-features-settings`       | 2026-11-04    | `onFailure`, `statusLine`, `subagentStatusLine`, `enabledPlugins`, deny syntax all current. `Write(...)` path rules are never consulted; use `Edit(...)`. `$schema` may lag newer keys. `/docs/en/settings` is now "Settings files and precedence"; per-key reference moved to `/docs/en/settings-reference` (~448k characters, about 67% read; `enabledPlugins` and sandbox subkey detail unread) |
| `agent-subagent-design`      | 2026-11-04    | All frontmatter fields valid; override of built-in `Explore` supported by `name`. Sub-agents page read in full. `disallowedTools: Agent` is redundant (every `tools` allowlist omits `Agent`) and would matter only if `tools` were dropped; subagents can spawn subagents three layers deep by default. Plugin subagents ignore `hooks`, `permissionMode` and `mcpServers` |
| `skills-context-engineering` | 2026-11-04    | Frontmatter valid; description plus `when_to_use` truncated at 1,536 characters in the listing (`skillListingMaxDescChars`), 1,024 in the platform spec; bodies under 500 lines (largest now `customize`, 289). After compaction only the start of an invoked skill is kept, so critical gates belong near the top. `.claude/CLAUDE.md` is a valid location (53 lines) |
| `hooks-lifecycle`            | 2026-11-04    | `PreToolUse`, matchers, stdin fields, exit 2 plus stderr current. `PreToolUse` **does** fire inside subagents (input carries `agent_id` and `agent_type`). Hooks page (286k) read in full. The `if` filter is best-effort; since 2.1.314 `Bash`-matched hooks also run on Monitor commands. Exec form (`args`) is preferred for path placeholders; the shell form here already double-quotes them. Top-level `decision` remains deprecated for `PreToolUse` (not used here) |
