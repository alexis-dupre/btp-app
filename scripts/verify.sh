#!/usr/bin/env bash
# The one command. CI runs exactly this. If CI and local disagree, that is a bug in the setup.
#
# Stages whose npm script does not exist yet are reported as SKIPPED, loudly, and listed in
# the summary. A skipped stage is never counted as a pass — the gate tells you what it did
# not check, so an unconfigured tool can never be mistaken for a green one.
set -uo pipefail

FAST="${1:-}"
SKIPPED=()
FAILED=0

has_script() {
  node -e "const s=require('./package.json').scripts||{};process.exit(s['$1']?0:1)" 2>/dev/null
}

run() {
  local label="$1"; shift
  local script="$1"; shift
  if ! has_script "$script"; then
    echo
    echo "── $label"
    echo "   SKIPPED — no '$script' script in package.json yet."
    SKIPPED+=("$label ($script)")
    return 0
  fi
  echo
  echo "── $label"
  if ! pnpm run -s "$script"; then
    FAILED=1
    return 1
  fi
}

run "typecheck"      typecheck      || exit 1
run "lint"           lint           || exit 1
run "unit tests"     test:unit      || exit 1

echo
echo "── spec contract"
SPECS=$(git ls-files -co --exclude-standard 'docs/specs/*/SPEC.md')
if [ -z "$SPECS" ]; then
  echo "   SKIPPED — no spec folders found, nothing checked."
  SKIPPED+=("spec contract (no specs yet)")
else
  printf '%s\n' "$SPECS" | xargs node scripts/check-spec.mjs || exit 1
fi

echo; echo "── rules register"; node scripts/check-rules.mjs || exit 1

if [ "$FAST" = "--fast" ]; then
  echo
  [ ${#SKIPPED[@]} -gt 0 ] && printf 'Not checked: %s\n' "$(IFS=', '; echo "${SKIPPED[*]}")"
  echo "Fast gate passed."
  exit 0
fi

run "build"              build             || exit 1
run "integration tests"  test:integration  || exit 1
run "e2e tests"          test:e2e          || exit 1
run "accessibility"      test:a11y         || exit 1

if has_script build && [ -f scripts/check-bundle-budget.mjs ]; then
  echo
  echo "── bundle budget"
  node scripts/check-bundle-budget.mjs || exit 1
fi

echo
echo "── dependency audit"
pnpm audit --audit-level=high || exit 1

echo
if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo "Not checked (add the script when the tool lands):"
  printf '  - %s\n' "${SKIPPED[@]}"
fi
echo "Full gate passed."
