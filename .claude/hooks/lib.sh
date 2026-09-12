#!/usr/bin/env bash
# Shared helpers for Claude Code hooks.
# Hook input arrives as JSON on stdin. We read it once into $HOOK_INPUT.

set -uo pipefail

HOOK_INPUT="$(cat)"
export HOOK_INPUT

# hook_field <jq-path>  ->  prints the value or nothing
hook_field() {
  local path="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$HOOK_INPUT" | jq -r "${path} // empty" 2>/dev/null
  else
    HOOK_PATH="$path" python3 - <<'PY' 2>/dev/null
import json, os, sys
data = json.loads(os.environ.get("HOOK_INPUT") or "{}")
path = os.environ["HOOK_PATH"].lstrip(".")
cur = data
for part in path.split("."):
    if isinstance(cur, dict) and part in cur:
        cur = cur[part]
    else:
        sys.exit(0)
print(cur if isinstance(cur, str) else json.dumps(cur))
PY
  fi
}

# block <message>  -> tells Claude the action is refused and why
block() {
  echo "$1" >&2
  exit 2
}

# Only run heavy checks when the toolchain is actually installed.
has_project() { [ -f package.json ]; }
