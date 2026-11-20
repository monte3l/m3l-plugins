// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Fails when the documentation and the repository disagree: the README's
// plugin table against the catalog (both ways, and each row's source link), and
// docs/architecture.md's tables of scripts, modules and workflows, and its list
// of `verify` jobs, against `bin/`, `bin/lib/`, `.github/workflows/` and
// `verify.yml`. Every `bin/` path the two documents name must exist.
//
// `check-catalog.mjs` already fails when a catalog entry has no README row. This
// closes the other direction: a README row for a plugin that is no longer listed.
//
// The docs kit runs this as a parity module (docs.config.mjs `parity`), and
// `verify` runs the kit's `--check`. Standalone: `node bin/doc-parity.mjs`
// prints ok or the drift and exits 1. It reads files only: no network. A file it
// cannot read or parse is reported as a message and not thrown, because a throw
// would crash the docs gate with a stack trace and an exit code that reads as drift.
//
// Only the files a person writes are compared: `*.mjs` and `*.sh` directly in
// `bin/`, `*.mjs` in `bin/lib/`, and `*.yml` or `*.yaml` in `.github/workflows/`.
// An editor backup or `.DS_Store` is not a script, and a script in another
// subdirectory of `bin/` is not compared.
//
// Limits it inherits from the kit's table helper: a cell is cut at every `|`, and
// only the first table under a heading is read.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertSame,
  assertSameSet,
  codeSpans,
  section,
  tableColumn,
} from "../design/source/docs-kit/lib/parity.mjs";

const read = (root, path) => readFileSync(join(root, path), "utf8");

/** Runs one group of checks; a file it cannot read becomes a message, not a crash. */
const guarded = (what, fn) => {
  try {
    return fn();
  } catch (error) {
    return [`cannot check ${what}: ${error.message}`];
  }
};

/** Names of the files directly under `dir` whose name matches `pattern`, sorted. */
const filesIn = (root, dir, pattern) =>
  readdirSync(join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

/**
 * The job ids of a workflow file: the keys one level under `jobs:`, at whatever
 * indentation the file uses. An id may be quoted, hold dots or capitals, carry an
 * anchor or have a comment after it. No YAML parser, on purpose: nothing here
 * imports a package.
 */
export function jobIds(workflow) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => /^jobs:\s*(?:#.*)?$/.test(line));
  if (start === -1) return [];
  const ids = [];
  let indent = null;
  for (const line of lines.slice(start + 1)) {
    if (/^\s*(?:#.*)?$/.test(line)) continue;
    if (/^\S/.test(line)) break;
    const depth = line.length - line.trimStart().length;
    indent ??= depth;
    if (depth !== indent) continue;
    const match = /^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_.-]+))\s*:/.exec(line);
    if (match) ids.push(match[1] ?? match[2] ?? match[3]);
  }
  return ids;
}

/** `body` from the first table whose header row starts with `| header`, for a second table in one section. */
export const tableFrom = (body, header) => {
  const at = body.search(new RegExp(`^\\|\\s*${header}\\s*\\|`, "m"));
  return at === -1 ? "" : body.slice(at);
};

/**
 * Every `bin/...` path a code span in `text` names (`node bin/x.mjs --check` and
 * `./bin/x.mjs` name `bin/x.mjs`), without the punctuation a sentence puts after
 * it. A glob such as `bin/*.sh` names no single path and is skipped.
 */
export const binPaths = (text) => [
  ...new Set(
    codeSpans(text).flatMap((span) =>
      [...span.matchAll(/(?:^|\s)(?:\.\/)?(bin\/[A-Za-z0-9._/-]+)/g)].map((m) =>
        m[1].replace(/[.,;:]+$/, ""),
      ),
    ),
  ),
];

/**
 * The first code span of each row of a column, in row order. A row with none
 * gives `undefined`, so a name always stays on its own row.
 */
const firstSpans = (body, header) =>
  tableColumn(body, header).map((cell) => codeSpans(cell)[0]);

/**
 * The README plugin table against the catalog: the same names, and each row's
 * source link is the entry's `repository`.
 *
 * @param {{ readme: string, plugins: { name: string, repository?: string }[] }} input
 * @returns {string[]}
 */
export function pluginTableProblems({ readme, plugins }) {
  const body = section(readme, "Plugins");
  if (body === null) return ["README has no Plugins section"];
  const rowNames = firstSpans(body, "Plugin");
  const problems = assertSameSet(
    "README plugins table",
    rowNames.filter((name) => name !== undefined),
    plugins.map((plugin) => plugin.name),
  );
  const links = tableColumn(body, "Source").map(
    (cell) => /\]\((https:\/\/[^)\s]+)\)/.exec(cell)?.[1],
  );
  for (const plugin of plugins) {
    const row = rowNames.indexOf(plugin.name);
    if (row === -1) continue;
    problems.push(
      ...assertSame(
        `README source link of ${plugin.name}`,
        links[row],
        plugin.repository,
      ),
    );
  }
  return problems;
}

/**
 * docs/architecture.md against the repository.
 *
 * @param {{
 *   architecture: string,
 *   binFiles: string[],
 *   libFiles: string[],
 *   workflowFiles: string[],
 *   verifyJobs: string[],
 * }} input
 * @returns {string[]}
 */
export function architectureProblems({
  architecture,
  binFiles,
  libFiles,
  workflowFiles,
  verifyJobs,
}) {
  const problems = [];

  const scripts = section(architecture, "Scripts in `bin/`");
  if (scripts === null) {
    problems.push("docs/architecture.md has no Scripts in `bin/` section");
  } else {
    problems.push(
      ...assertSameSet(
        "architecture scripts table",
        firstSpans(scripts, "Script").filter((name) => name !== undefined),
        binFiles,
      ),
      ...assertSameSet(
        "architecture modules table",
        firstSpans(tableFrom(scripts, "Module"), "Module")
          .filter((name) => name !== undefined)
          .map((name) => name.replace(/^lib\//, "")),
        libFiles,
      ),
    );
  }

  const workflows = section(architecture, "Workflows");
  if (workflows === null) {
    problems.push("docs/architecture.md has no Workflows section");
  } else {
    problems.push(
      ...assertSameSet(
        "architecture workflows table",
        tableColumn(workflows, "Workflow").flatMap(codeSpans),
        workflowFiles,
      ),
    );
    // The capture may not span a blank line, so a reworded sentence cannot swallow the next paragraph.
    const listed =
      /Its\s+jobs\s+are\s+((?:(?!\n[ \t]*\n)[\s\S])+?),\s+and\s+the\s+final\s+`verify`\s+job/.exec(
        workflows,
      );
    if (listed === null) {
      problems.push(
        "docs/architecture.md no longer lists the jobs of `verify` as 'Its jobs are ..., and the final `verify` job'",
      );
    } else {
      problems.push(
        ...assertSameSet(
          "architecture verify jobs",
          codeSpans(listed[1]),
          verifyJobs.filter((id) => id !== "verify"),
        ),
      );
    }
  }
  return problems;
}

/** Returns one message per drift; empty when the documentation matches the repository. */
export default function check({ root }) {
  const problems = [];
  let readme = "";
  let architecture = "";
  problems.push(
    ...guarded("the plugin table", () => {
      readme = read(root, "README.md");
      const catalog = JSON.parse(read(root, ".claude-plugin/marketplace.json"));
      return pluginTableProblems({ readme, plugins: catalog.plugins ?? [] });
    }),
    ...guarded("docs/architecture.md", () => {
      architecture = read(root, "docs/architecture.md");
      return architectureProblems({
        architecture,
        binFiles: filesIn(root, "bin", /\.(?:mjs|sh)$/),
        libFiles: filesIn(root, "bin/lib", /\.mjs$/),
        workflowFiles: filesIn(root, ".github/workflows", /\.ya?ml$/),
        verifyJobs: jobIds(read(root, ".github/workflows/verify.yml")),
      });
    }),
  );
  for (const [file, text] of [
    ["README.md", readme],
    ["docs/architecture.md", architecture],
  ]) {
    for (const path of binPaths(text)) {
      if (!existsSync(join(root, path))) {
        problems.push(`${file} names ${path}, which does not exist`);
      }
    }
  }
  return problems;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const problems = check({ root });
  if (problems.length === 0) {
    console.log("ok: the documentation matches the repository");
  } else {
    for (const problem of problems) console.error(`doc-parity: ${problem}`);
    process.exitCode = 1;
  }
}
