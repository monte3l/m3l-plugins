#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Enrico Lionello (enri3l), Giulia Montevecchi (giulmonte), monte3l
# SPDX-License-Identifier: MIT

# Adds this catalog to a throwaway profile and installs every plugin from it,
# which is the only check that fetches the remote sources. Never touches the
# real ~/.claude.
set -euo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
home=$(mktemp -d)
trap 'rm -rf "$home"' EXIT
export HOME="$home"

claude plugin marketplace add "$repo"

fail=0
while IFS= read -r name; do
  claude plugin install "$name@monte3l" --scope user
done < <(jq -r '.plugins[].name' "$repo/.claude-plugin/marketplace.json")

installed=$(claude plugin list --json)
while IFS=$'\t' read -r name sha; do
  if ! jq -e --arg id "$name@monte3l" 'map(select(.id == $id)) | length == 1' <<<"$installed" >/dev/null; then
    echo "MISSING  $name@monte3l did not install" >&2
    fail=1
  else
    echo "OK       $name@monte3l (pinned ${sha:0:12})"
  fi
done < <(jq -r '.plugins[] | [.name, .source.sha] | @tsv' "$repo/.claude-plugin/marketplace.json")

exit "$fail"
