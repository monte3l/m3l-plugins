// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Helpers for bump-for-release.mjs. Zero dependencies. A `release-published`
// dispatch only says "look at this repository": it never sets a pin, because
// bump-pins.mjs reads the tag and commit from git itself.
import { repoOf } from "./catalog.mjs";

/** A payload value, made safe to print: short, printable ASCII only. */
// Only a string is printed as itself: String() on an object from a JSON payload
// can throw (`{"toString": 0}`), so anything else shows as its type.
const shown = (value) =>
  (typeof value === "string" ? value : `a ${value === null ? "null" : typeof value}`)
    .slice(0, 80)
    .replace(/[^\x20-\x7e]/g, "?");

/**
 * Accepts a payload only when it names a monte3l repository that some catalog
 * entry points at. Returns the slug and the names of the plugins it lists.
 * @param {{ repository?: unknown } | null | undefined} payload
 * @param {{ name: string, source: object }[]} plugins
 */
export function validateDispatch(payload, plugins) {
  const slug = payload?.repository;
  if (typeof slug !== "string" || !/^monte3l\/[A-Za-z0-9._-]+$/.test(slug)) {
    return { ok: false, reason: `"${shown(slug)}" is not a monte3l repository` };
  }
  const names = plugins
    .filter((entry) => {
      try {
        const { owner, repo } = repoOf(entry.source);
        return `${owner}/${repo}` === slug;
      } catch {
        return false;
      }
    })
    .map((entry) => entry.name);
  if (!names.length) return { ok: false, reason: `${slug} is not listed in the catalog` };
  return { ok: true, slug, plugins: names };
}

/**
 * The plugins whose pin differs between two catalogs, as
 * `{ name, from, to, sha, description }`, where `description` says the entry's
 * description changed with the pin.
 */
export function diffBumps(before, after) {
  const was = new Map(before.plugins.map((e) => [e.name, e]));
  return after.plugins
    .filter((e) => was.has(e.name) && (was.get(e.name).source.ref !== e.source.ref || was.get(e.name).source.sha !== e.source.sha))
    .map((e) => ({
      name: e.name,
      from: was.get(e.name).source.ref,
      to: e.source.ref,
      sha: e.source.sha,
      description: was.get(e.name).description !== e.description,
    }));
}

/** One CHANGELOG line per bump, appended to the end of the Unreleased list. */
export function appendBumpLines(changelog, bumps) {
  if (!/^## Unreleased$/m.test(changelog)) throw new Error("CHANGELOG.md has no Unreleased section");
  const lines = bumps
    .map((b) => `- Moved \`${b.name}\` to \`${b.to}\`${b.description ? ", and its description to match `plugin.json`" : ""}.\n`)
    .join("");
  return `${changelog.replace(/\n*$/, "\n")}${lines}`;
}

/** Throws unless every value is safe to put in a branch name, a title or a workflow output. */
export function assertSafeBumps(bumps) {
  const safe = /^[A-Za-z0-9@._/+-]+$/;
  for (const b of bumps) {
    for (const value of [b.name, b.to]) {
      if (!safe.test(value)) throw new Error(`unexpected characters in "${shown(value)}"`);
    }
    if (!/^[0-9a-f]{40}$/.test(b.sha)) throw new Error(`sha for ${b.name} is not 40 hex characters`);
  }
}
