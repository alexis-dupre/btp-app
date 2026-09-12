#!/usr/bin/env bash
# Stop: refuse to end the turn on a red tree.
# Set BTP_STRICT_STOP=0 in .claude/settings.json to downgrade this to a warning.
source "$(dirname "$0")/lib.sh"

has_project || exit 0
[ "${BTP_STRICT_STOP:-1}" = "0" ] && exit 0

# Nothing changed -> nothing to verify.
git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null && exit 0

if OUT="$(pnpm run -s verify:fast 2>&1)"; then
  exit 0
fi

echo "The quality gate is red. Fix it before ending the turn (or tell the user why you can't):" >&2
printf '%s\n' "$OUT" | tail -60 >&2
exit 2
