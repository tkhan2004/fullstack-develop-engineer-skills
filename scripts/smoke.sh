#!/usr/bin/env bash
# Smoke-test the built binary end to end on a copy of a fixture: analyze, init, generate, --check.
# Unit tests import sources directly, so only this can catch bundling problems.
set -euo pipefail
cd "$(dirname "$0")/.."
CLI="node $PWD/apps/cli/dist/cli.js"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -R tests/fixtures/repos/express-layered-clean/. "$WORK"

$CLI analyze --no-write --deterministic --cwd "$WORK" > /dev/null
$CLI init --yes --adapters claude,generic --cwd "$WORK" > /dev/null
$CLI generate --cwd "$WORK" > /dev/null
$CLI generate --check --cwd "$WORK" > /dev/null
test -f "$WORK/CLAUDE.md"
test -f "$WORK/.engineering/generated/lockfile.yaml"
echo "smoke ok"
