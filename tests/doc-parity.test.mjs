// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import check, {
  architectureProblems,
  binPaths,
  jobIds,
  pluginTableProblems,
  tableFrom,
} from "../bin/doc-parity.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const table = (header, rows) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

test("jobIds reads the keys under jobs: and stops at the next top-level key", () => {
  const workflow = [
    "name: Verify",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  checks:",
    "    name: Checks",
    "  # a comment",
    "  dco:",
    "    name: DCO",
    "  verify:",
    "    needs: [checks, dco]",
    "env:",
    "  other:",
  ].join("\n");
  assert.deepEqual(jobIds(workflow), ["checks", "dco", "verify"]);
  assert.deepEqual(jobIds("name: x\non: push\n"), []);
});

test("tableFrom finds a second table by its header row, padded or not", () => {
  const body = `${table(["Script", "Does"], [["`a`", "x"]])}\n\nProse.\n\n| Module   | Responsibility |\n| -------- | -------------- |\n| \`lib/b.mjs\` | y |\n`;
  assert.match(tableFrom(body, "Module"), /^\| Module/);
  assert.equal(tableFrom(body, "Nope"), "");
});

test("binPaths names the bin/ paths in code spans, once, and nothing else", () => {
  const text =
    "Run `node bin/check-catalog.mjs --apply` and `bin/smoke-install.sh`, or `node bin/check-catalog.mjs`. See `bin/` and `lib/catalog.mjs`, and bin/not-in-a-span.mjs.";
  assert.deepEqual(binPaths(text), [
    "bin/check-catalog.mjs",
    "bin/smoke-install.sh",
  ]);
});

const plugins = [
  { name: "alpha", repository: "https://github.com/monte3l/m3l-alpha" },
  { name: "beta", repository: "https://github.com/monte3l/m3l-beta" },
];
const readmeWith = (rows) =>
  `# R\n\n## Plugins\n\n${table(["Plugin", "What it does", "Source"], rows)}\n\n## Next\n`;
const goodRows = [
  ["`alpha`", "Does a.", "[m3l-alpha](https://github.com/monte3l/m3l-alpha)"],
  ["`beta`", "Does b.", "[m3l-beta](https://github.com/monte3l/m3l-beta)"],
];

test("a README plugin table that matches the catalog has no problems", () => {
  assert.deepEqual(
    pluginTableProblems({ readme: readmeWith(goodRows), plugins }),
    [],
  );
});

test("a README row for a plugin that is no longer in the catalog is a problem", () => {
  // The direction check-catalog.mjs does not cover: a stale row.
  const rows = [...goodRows, ["`gone`", "Removed.", "[x](https://github.com/monte3l/x)"]];
  assert.deepEqual(pluginTableProblems({ readme: readmeWith(rows), plugins }), [
    "README plugins table: in the docs, not in code: gone",
  ]);
});

test("a catalog entry with no README row is a problem", () => {
  assert.deepEqual(
    pluginTableProblems({ readme: readmeWith([goodRows[0]]), plugins }),
    ["README plugins table: in code, not in the docs: beta"],
  );
});

test("a source link that is not the entry's repository is a problem", () => {
  const rows = [
    goodRows[0],
    ["`beta`", "Does b.", "[m3l-beta](https://github.com/monte3l/other)"],
  ];
  const problems = pluginTableProblems({ readme: readmeWith(rows), plugins });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /README source link of beta: docs say .*other.*code says .*m3l-beta/);
});

test("a row with two code spans or none does not move a link onto another plugin", () => {
  const rows = [
    ["no name", "A row with no code span.", "[x](https://github.com/monte3l/zzz)"],
    goodRows[0],
    goodRows[1],
  ];
  assert.deepEqual(pluginTableProblems({ readme: readmeWith(rows), plugins }), []);
});

test("a README without a Plugins section is a problem, not a crash", () => {
  assert.deepEqual(pluginTableProblems({ readme: "# R\n", plugins }), [
    "README has no Plugins section",
  ]);
});

const architecture = ({ scripts, modules, workflows, jobs }) =>
  [
    "# Architecture",
    "## Scripts in `bin/`",
    table(["Script", "What it does"], scripts.map((name) => [`\`${name}\``, "x"])),
    "The logic lives in `bin/lib/`.",
    table(["Module", "Responsibility"], modules.map((name) => [`\`lib/${name}\``, "y"])),
    "## Workflows",
    table(["Workflow", "Trigger"], workflows),
    `The \`verify\` workflow is the aggregate. Its jobs are ${jobs}, and the final \`verify\` job passes only when each is green.`,
  ].join("\n\n");
const inputs = {
  scripts: ["a.mjs", "b.sh"],
  modules: ["c.mjs"],
  workflows: [["`verify.yml`", "push"], ["`x.yml`, `y.yml`", "weekly"]],
  jobs: "`checks`, `lint` and `dco`",
};
const repo = {
  binFiles: ["a.mjs", "b.sh"],
  libFiles: ["c.mjs"],
  workflowFiles: ["verify.yml", "x.yml", "y.yml"],
  verifyJobs: ["checks", "lint", "dco", "verify"],
};
const problemsFor = (over = {}, repoOver = {}) =>
  architectureProblems({
    architecture: architecture({ ...inputs, ...over }),
    ...repo,
    ...repoOver,
  });

test("an architecture document that matches the repository has no problems", () => {
  assert.deepEqual(problemsFor(), []);
});

test("a script, a module or a workflow that exists but is not documented is a problem", () => {
  assert.deepEqual(problemsFor({}, { binFiles: [...repo.binFiles, "new.mjs"] }), [
    "architecture scripts table: in code, not in the docs: new.mjs",
  ]);
  assert.deepEqual(problemsFor({}, { libFiles: [...repo.libFiles, "d.mjs"] }), [
    "architecture modules table: in code, not in the docs: d.mjs",
  ]);
  assert.deepEqual(
    problemsFor({}, { workflowFiles: [...repo.workflowFiles, "scancode.yml"] }),
    ["architecture workflows table: in code, not in the docs: scancode.yml"],
  );
});

test("a documented script, module or workflow that no longer exists is a problem", () => {
  assert.deepEqual(problemsFor({ scripts: [...inputs.scripts, "old.mjs"] }), [
    "architecture scripts table: in the docs, not in code: old.mjs",
  ]);
  assert.deepEqual(problemsFor({ modules: [...inputs.modules, "old.mjs"] }), [
    "architecture modules table: in the docs, not in code: old.mjs",
  ]);
});

test("the list of verify jobs is compared with verify.yml, without the aggregate", () => {
  assert.deepEqual(problemsFor({}, { verifyJobs: ["checks", "lint", "dco", "catalog", "verify"] }), [
    "architecture verify jobs: in code, not in the docs: catalog",
  ]);
  assert.deepEqual(problemsFor({ jobs: "`checks`, `lint`, `dco` and `gone`" }), [
    "architecture verify jobs: in the docs, not in code: gone",
  ]);
});

test("a sentence about the verify jobs that is rewrapped across lines still reads", () => {
  const text = architecture({ ...inputs }).replace("Its jobs are", "Its\njobs are").replace(", and the final", ",\nand the final");
  assert.deepEqual(architectureProblems({ architecture: text, ...repo }), []);
});

test("a missing section or sentence is a problem, not a crash", () => {
  assert.deepEqual(architectureProblems({ architecture: "# A\n", ...repo }), [
    "docs/architecture.md has no Scripts in `bin/` section",
    "docs/architecture.md has no Workflows section",
  ]);
  const reworded = architecture(inputs).replace("Its jobs are", "The jobs are");
  assert.match(architectureProblems({ architecture: reworded, ...repo })[0], /no longer lists the jobs of `verify`/);
});

test("the documentation and the repository agree", () => {
  assert.deepEqual(check({ root: repoRoot }), []);
});

test("it runs as a program and says ok", () => {
  const result = spawnSync(process.execPath, [join(repoRoot, "bin", "doc-parity.mjs")], { encoding: "utf8" });
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /ok: the documentation matches the repository/);
  assert.equal(result.status, 0);
});

// The same module against copies of the real files, one thing broken at a time:
// this is what proves the file reading is wired to the right paths.
const copies = [];
const copyOfRepo = () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-parity-"));
  copies.push(dir);
  for (const rel of ["README.md", "docs/architecture.md", ".claude-plugin/marketplace.json", ".github/workflows", "bin"]) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    cpSync(join(repoRoot, rel), join(dir, rel), { recursive: true });
  }
  return dir;
};
const edit = (dir, rel, fn) => writeFileSync(join(dir, rel), fn(readFileSync(join(dir, rel), "utf8")));
test.after(() => {
  for (const dir of copies) rmSync(dir, { recursive: true, force: true });
});

test("copies: untouched is clean", () => {
  assert.deepEqual(check({ root: copyOfRepo() }), []);
});

test("copies: a plugin removed from the catalog leaves a stale README row that is reported", () => {
  const dir = copyOfRepo();
  edit(dir, ".claude-plugin/marketplace.json", (text) => {
    const catalog = JSON.parse(text);
    catalog.plugins = catalog.plugins.filter((plugin) => plugin.name !== "m3l-claude-mentor");
    return JSON.stringify(catalog, null, 2);
  });
  assert.deepEqual(check({ root: dir }), [
    "README plugins table: in the docs, not in code: m3l-claude-mentor",
  ]);
});

test("copies: a workflow nobody documented is reported", () => {
  const dir = copyOfRepo();
  writeFileSync(join(dir, ".github", "workflows", "extra.yml"), "name: extra\n");
  assert.deepEqual(check({ root: dir }), [
    "architecture workflows table: in code, not in the docs: extra.yml",
  ]);
});

test("copies: a bin script nobody documented is reported", () => {
  const dir = copyOfRepo();
  writeFileSync(join(dir, "bin", "extra.mjs"), "");
  assert.deepEqual(check({ root: dir }), [
    "architecture scripts table: in code, not in the docs: extra.mjs",
  ]);
});

test("copies: a job added to verify.yml but not to the document is reported", () => {
  const dir = copyOfRepo();
  edit(dir, ".github/workflows/verify.yml", (text) => `${text}\n  extra:\n    name: Extra\n`);
  assert.deepEqual(check({ root: dir }), [
    "architecture verify jobs: in code, not in the docs: extra",
  ]);
});

test("copies: a bin/ path the README names but that does not exist is reported", () => {
  const dir = copyOfRepo();
  edit(dir, "README.md", (text) => text.replace("`node bin/check-catalog.mjs`", "`node bin/check-everything.mjs`"));
  assert.deepEqual(check({ root: dir }), [
    "README.md names bin/check-everything.mjs, which does not exist",
  ]);
});

test("copies: a missing or invalid file is reported, not thrown", () => {
  const missing = copyOfRepo();
  rmSync(join(missing, ".claude-plugin", "marketplace.json"));
  assert.match(check({ root: missing })[0], /^cannot check the plugin table: /);

  const broken = copyOfRepo();
  writeFileSync(join(broken, ".claude-plugin", "marketplace.json"), "{ nope");
  assert.match(check({ root: broken })[0], /^cannot check the plugin table: /);

  const noDocs = copyOfRepo();
  rmSync(join(noDocs, "docs", "architecture.md"));
  assert.match(check({ root: noDocs })[0], /^cannot check docs\/architecture\.md: /);
});

test("jobIds reads ids at the file's own indentation, quoted or capitalised, with anchors and comments", () => {
  const workflow = [
    "jobs: # the lanes",
    "    Checks:",
    "      name: Checks",
    "    'quoted-one': # a comment",
    "      name: Q",
    '    "dotted.id":',
    "      name: D",
    "    anchored: &lane",
    "      name: A",
    "",
    "    # a comment between jobs",
    "    last:",
    "      steps: []",
    "other:",
    "    not-a-job:",
  ].join("\n");
  assert.deepEqual(jobIds(workflow), ["Checks", "quoted-one", "dotted.id", "anchored", "last"]);
});

test("binPaths drops the punctuation a sentence puts after a path, reads ./bin and skips a glob", () => {
  assert.deepEqual(binPaths("`./bin/a.mjs`, `node bin/b.mjs,` and `bin/c.sh.`, and `bin/*.sh`."), [
    "bin/a.mjs",
    "bin/b.mjs",
    "bin/c.sh",
  ]);
});

test("the verify jobs sentence cannot swallow the next paragraph when it is reworded", () => {
  const reworded = architecture({ ...inputs }).replace(
    /Its jobs are .*$/m,
    "Its jobs are `checks` and `lint`.\n\nSome other paragraph, and the final `verify` job is elsewhere.",
  );
  const problems = architectureProblems({ architecture: reworded, ...repo });
  assert.equal(problems.length, 1, problems.join("\n"));
  assert.match(problems[0], /no longer lists the jobs of `verify`/);
});

test("copies: editor debris and non-scripts in bin/, bin/lib/ and the workflows are not reported", () => {
  const dir = copyOfRepo();
  for (const rel of ["bin/.DS_Store", "bin/extra.mjs~", "bin/notes.txt", "bin/lib/notes.txt", "bin/lib/.hidden.mjs~", ".github/workflows/README.md"]) {
    writeFileSync(join(dir, rel), "debris\n");
  }
  assert.deepEqual(check({ root: dir }), []);
});

test("copies: an undocumented workflow with the .yaml extension is reported too", () => {
  const dir = copyOfRepo();
  writeFileSync(join(dir, ".github", "workflows", "extra.yaml"), "name: extra\n");
  assert.deepEqual(check({ root: dir }), [
    "architecture workflows table: in code, not in the docs: extra.yaml",
  ]);
});

test("copies: a job id with capitals in verify.yml is seen, so an undocumented one is reported", () => {
  const dir = copyOfRepo();
  edit(dir, ".github/workflows/verify.yml", (text) => `${text}\n  ExtraLane:\n    name: Extra\n`);
  assert.deepEqual(check({ root: dir }), [
    "architecture verify jobs: in code, not in the docs: ExtraLane",
  ]);
});
