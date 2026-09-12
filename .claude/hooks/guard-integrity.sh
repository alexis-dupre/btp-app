#!/usr/bin/env bash
# PreToolUse (Edit|Write): the gate cannot edit itself.
#
# This is the hook that makes unattended runs trustworthy. An autonomous agent that can
# relax tsconfig, delete a test, widen an eslint rule or edit the CI workflow can always
# make the gate green. It must not be able to.
#
# A human changes these files deliberately, with BTP_ALLOW_GATE_EDIT=1 in the environment.
source "$(dirname "$0")/lib.sh"

FILE="$(hook_field '.tool_input.file_path')"
[ -z "$FILE" ] && exit 0
[ "${BTP_ALLOW_GATE_EDIT:-0}" = "1" ] && exit 0

REL="${FILE#"$PWD"/}"

case "$REL" in
  .claude/settings.json|.claude/hooks/*|.claude/agents/*|.github/workflows/*|\
  scripts/verify.sh|scripts/check-bundle-budget.mjs|scripts/loop/*|\
  tsconfig.json|eslint.config.*|.eslintrc*|vitest.config.*|vitest.integration.*|\
  playwright.config.*|docs/standards/*)
    block "Refused: '$REL' is part of the quality gate. An agent does not change the rules it
is measured by. If this change is genuinely needed, stop and ask the user to make it — or
re-run with BTP_ALLOW_GATE_EDIT=1 after they approve it explicitly." ;;
esac

# Deleting or skipping tests is the other way to a false green.
case "$REL" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|tests/*|e2e/*)
    CONTENT="$(hook_field '.tool_input.new_string')$(hook_field '.tool_input.content')"
    if printf '%s' "$CONTENT" | grep -Eq '\.(skip|todo|only)\(|xit\(|xdescribe\('; then
      block "Refused: skipped, focused or todo tests. A failing test is fixed, not silenced.
If the behaviour is genuinely deferred, delete the test and record it in docs/backlog/deferred.md."
    fi ;;
esac

exit 0
