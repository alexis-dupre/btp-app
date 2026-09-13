#!/usr/bin/env bash
# PreToolUse (Edit|Write): refuse to touch an area another live session owns.
#
# Parallel Claude Code sessions do not collide on git — they collide on meaning. Two
# streams editing the same schema, or each adding a migration, merge cleanly and produce
# something nobody designed. This hook makes that impossible rather than discouraged.
source "$(dirname "$0")/lib.sh"

FILE="$(hook_field '.tool_input.file_path')"
[ -z "$FILE" ] && exit 0

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -d "$ROOT/scripts/stream" ] || exit 0

REL="${FILE#"$ROOT"/}"
STREAM="$(cat "$ROOT/.btp-stream" 2>/dev/null)"

# No stream registered anywhere -> single-session mode, nothing to coordinate.
python3 "$ROOT/scripts/stream/streams.py" list 2>/dev/null | grep -q '^\[LIVE' || exit 0

OUT="$(python3 "$ROOT/scripts/stream/streams.py" check "$REL" --stream "$STREAM" 2>&1)"
RC=$?
[ -n "$STREAM" ] && python3 "$ROOT/scripts/stream/streams.py" heartbeat "$STREAM" 2>/dev/null

if [ $RC -ne 0 ]; then
  block "Refused — parallel session conflict.
$OUT"
fi
exit 0
