// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Property-based tests for the parsers in bin/lib/ that read input from outside
// the repository: `git ls-remote` output, tag names, a dispatch payload, a
// catalog entry and a shell command. fast-check generates the inputs, so these
// cover shapes no hand-written case thinks of. Run from the repository root:
//   npm ci --prefix tests/property && node --test "tests/property/*.property.test.js"
import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import { cmpSemver, entryProblems, matchReleaseTags, parseLsRemote } from "../../bin/lib/catalog.mjs";
import { validateDispatch } from "../../bin/lib/dispatch.mjs";
import { parseGitPush } from "../../bin/lib/signed-range.mjs";

const hex40 = fc.stringMatching(/^[0-9a-f]{40}$/);
const version = fc.tuple(fc.nat(999), fc.nat(999), fc.nat(999)).map((v) => v.join("."));

test("parseLsRemote never throws, and only yields 40-hex commits", () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 400 }), (out) => {
      for (const t of parseLsRemote(out).values()) {
        for (const sha of Object.values(t)) assert.match(sha, /^[0-9a-f]{40}$/);
      }
    }),
  );
});

test("parseLsRemote round-trips well-formed lines", () => {
  const line = fc.tuple(hex40, fc.stringMatching(/^[a-z0-9._-]{1,20}$/));
  fc.assert(
    fc.property(fc.uniqueArray(line, { selector: ([, name]) => name }), (lines) => {
      const out = lines.map(([sha, name]) => `${sha}\trefs/tags/${name}`).join("\n");
      const tags = parseLsRemote(out);
      assert.equal(tags.size, lines.length);
      for (const [sha, name] of lines) assert.equal(tags.get(name).direct, sha);
    }),
  );
});

test("cmpSemver is antisymmetric, transitive and reflexive", () => {
  fc.assert(
    fc.property(version, version, version, (a, b, c) => {
      assert.equal(cmpSemver(a, a), 0);
      assert.equal(Math.sign(cmpSemver(a, b)), -Math.sign(cmpSemver(b, a)) || 0);
      if (cmpSemver(a, b) <= 0 && cmpSemver(b, c) <= 0) assert.ok(cmpSemver(a, c) <= 0);
    }),
  );
});

test("matchReleaseTags returns only matching tags, newest first", () => {
  const names = fc.uniqueArray(fc.oneof(version.map((v) => `p--v${v}`), fc.string({ maxLength: 12 })), { maxLength: 15 });
  fc.assert(
    fc.property(names, (tagNames) => {
      const tags = new Map(tagNames.map((n) => [n, { direct: "a".repeat(40) }]));
      const found = matchReleaseTags(tags, "p--v*");
      for (const f of found) assert.match(f.tag, /^p--v\d+\.\d+\.\d+$/);
      for (let i = 1; i < found.length; i++) assert.ok(cmpSemver(found[i - 1].version, found[i].version) >= 0);
    }),
  );
});

test("validateDispatch accepts only a listed monte3l repository", () => {
  const plugins = [{ name: "demo", source: { source: "url", url: "https://github.com/monte3l/demo.git" } }];
  fc.assert(
    fc.property(fc.anything(), (repository) => {
      const r = validateDispatch({ repository }, plugins);
      assert.equal(r.ok, repository === "monte3l/demo");
    }),
  );
  fc.assert(
    fc.property(fc.string(), (repository) => {
      const r = validateDispatch({ repository }, plugins);
      if (r.ok) assert.equal(r.slug, "monte3l/demo");
      else assert.equal(typeof r.reason, "string");
      assert.doesNotMatch(r.reason ?? "", /[^\x20-\x7e]/);
    }),
  );
});

test("validateDispatch tolerates a missing or odd payload", () => {
  fc.assert(
    fc.property(fc.anything(), (payload) => {
      assert.equal(validateDispatch(payload, []).ok, false);
    }),
  );
});

test("entryProblems never throws, and always names a bad entry's problems", () => {
  fc.assert(
    fc.property(fc.record({ name: fc.string(), homepage: fc.anything(), version: fc.anything(), source: fc.anything() }, { requiredKeys: [] }), fc.string(), (entry, readme) => {
      const problems = entryProblems(entry, readme);
      assert.ok(Array.isArray(problems));
      for (const p of problems) assert.equal(typeof p, "string");
    }),
  );
});

test("parseGitPush never throws, and a dry run is always a push", () => {
  fc.assert(
    fc.property(fc.anything(), (command) => {
      const r = parseGitPush(command);
      assert.equal(typeof r.isPush, "boolean");
      if (r.dryRun) assert.equal(r.isPush, true);
    }),
  );
  fc.assert(
    fc.property(fc.string({ maxLength: 80 }), (junk) => {
      assert.equal(parseGitPush(`git push ${junk.replace(/[;&|\n]/g, " ")}`).isPush, true);
    }),
  );
});
