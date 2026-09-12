#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the touched file and typecheck the project.
# Fast feedback loop: the agent sees its own mistake before it moves on.
source "$(dirname "$0")/lib.sh"

FILE="$(hook_field '.tool_input.file_path')"
[ -z "$FILE" ] && exit 0
has_project || exit 0

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css|*.md) ;;
  *) exit 0 ;;
esac

pnpm exec prettier --write "$FILE" >/dev/null 2>&1 || true

case "$FILE" in
  *.ts|*.tsx)
    pnpm exec eslint --fix "$FILE" >/dev/null 2>&1 || true
    OUT="$(pnpm exec tsc --noEmit -p tsconfig.json 2>&1)" || {
      echo "TypeScript is failing after your edit. Fix it now, do not continue:" >&2
      printf '%s\n' "$OUT" | head -40 >&2
      exit 2
    } ;;
esac

exit 0
