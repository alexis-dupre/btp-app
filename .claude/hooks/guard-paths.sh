#!/usr/bin/env bash
# PreToolUse (Edit|Write|NotebookEdit): refuse writes to protected paths.
# The rules themselves live in path_policy.py, shared with guard-bash.sh, so a Bash
# redirection cannot do what the Edit tool is forbidden from doing.
source "$(dirname "$0")/lib.sh"

FILE="$(hook_field '.tool_input.file_path')"
[ -z "$FILE" ] && exit 0

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUT="$(BTP_REPO_ROOT="$ROOT" python3 "$(dirname "$0")/path_policy.py" policy "$FILE" 2>&1)" || block "Refused: $OUT"
exit 0
