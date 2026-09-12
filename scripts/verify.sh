#!/usr/bin/env bash
# The one command. CI runs exactly this. If CI and local disagree, that is a bug in the setup.
set -euo pipefail

FAST="${1:-}"

run() { echo; echo "── $1"; shift; "$@"; }

run "typecheck"   pnpm typecheck
run "lint"        pnpm lint
run "unit tests"  pnpm test:unit

if [ "$FAST" = "--fast" ]; then
  echo; echo "Fast gate passed."
  exit 0
fi

run "build"               pnpm build
run "integration tests"   pnpm test:integration
run "e2e tests"           pnpm test:e2e
run "accessibility"       pnpm test:a11y
run "bundle budget"       node scripts/check-bundle-budget.mjs
run "dependency audit"    pnpm audit --audit-level=high

echo; echo "Full gate passed."
