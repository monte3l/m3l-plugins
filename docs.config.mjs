// SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
// SPDX-License-Identifier: MIT

// Docs kit config. The kit is design/source/docs-kit/ (vendored from m3l-design);
// its README documents every key. Every tracked *.md file must be a page or be
// excluded with a reason, or `node design/source/docs-kit/build.mjs --check` fails.
export default {
  title: "m3l-plugins",
  repo: "https://github.com/monte3l/m3l-plugins",
  siteUrl: "https://plugins.monte3l.com",
  designDir: "design",
  brand: true,
  manifest: "package.json", // its homepage must equal siteUrl
  navGroups: ["Start", "Project", "Security"],
  pages: [
    { src: "README.md", out: "index.html", group: "Start", label: "Overview" },
    { src: "CONTRIBUTING.md", out: "CONTRIBUTING.html", group: "Project", label: "Contributing" },
    { src: "GOVERNANCE.md", out: "GOVERNANCE.html", group: "Project", label: "Governance" },
    { src: "ROADMAP.md", out: "ROADMAP.html", group: "Project", label: "Roadmap" },
    { src: "docs/architecture.md", out: "architecture.html", group: "Project", label: "Architecture" },
    { src: "design/README.md", out: "design.html", group: "Project", label: "Design system" },
    { src: "SECURITY.md", out: "SECURITY.html", group: "Security", label: "Security policy" },
    { src: "docs/assurance-case.md", out: "assurance-case.html", group: "Security", label: "Assurance case" },
  ],
  exclude: [
    { glob: "CHANGELOG.md", reason: "release notes live on the GitHub releases page" },
    { glob: ".claude/**", reason: "instructions for coding agents, not reader-facing" },
    { glob: "docs/research/**", reason: "harness refresh tracker for coding agents, not reader-facing" },
    { glob: ".groundwork/**", reason: "adoption and customization reports for maintainers, not reader-facing" },
    { glob: "design/source/**", reason: "vendored m3l-design release, never edited here; the kit and brand book are documented upstream" },
  ],
};
