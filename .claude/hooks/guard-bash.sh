#!/usr/bin/env bash
# PreToolUse (Bash): refuse commands that break the project's contracts, and refuse any
# command that writes to a path the Edit guards protect.
#
# A rule that only applies to the Edit tool is not a rule. `cat > file`, `sed -i`, `tee`,
# `cp` and `mv` all write files through Bash. They go through the same policy.
source "$(dirname "$0")/lib.sh"

CMD="$(hook_field '.tool_input.command')"
[ -z "$CMD" ] && exit 0
HOOKDIR="$(dirname "$0")"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Stream checks only apply when a parallel session is actually registered and live.
STREAMS_LIVE=0
if [ -f "$ROOT/scripts/stream/streams.py" ] && git rev-parse --git-common-dir >/dev/null 2>&1; then
  python3 "$ROOT/scripts/stream/streams.py" list 2>/dev/null | grep -q '^\[LIVE' && STREAMS_LIVE=1
fi

# --- 1. protected paths, whatever the write mechanism -----------------------
while IFS= read -r T; do
  [ -z "$T" ] && continue
  if OUT="$(BTP_REPO_ROOT="$ROOT" python3 "$HOOKDIR/path_policy.py" policy "$T" 2>&1)"; then
    :
  else
    block "Refused — this command writes to a protected path.
$OUT

Writing through the shell does not bypass the rule. If the change is genuinely needed,
stop and ask the user."
  fi
  if [ "$STREAMS_LIVE" = "1" ]; then
    S="$(cat "$ROOT/.btp-stream" 2>/dev/null)"
    REL="${T#"$ROOT"/}"
    if ! OUT="$(python3 "$ROOT/scripts/stream/streams.py" check "$REL" --stream "$S" 2>&1)"; then
      block "Refused — parallel session conflict.
$OUT"
    fi
  fi
done < <(python3 "$HOOKDIR/path_policy.py" targets "$CMD")

# --- 2. interpreter escapes -------------------------------------------------
# A one-liner can write anywhere; we cannot parse it, so we refuse the combination of an
# inline interpreter and a protected path appearing anywhere in the command.
if printf '%s' "$CMD" | grep -Eq '\b(python3?|node|perl|ruby|osascript)\b[^|;&]*\s-(c|e)\b'; then
  if printf '%s' "$CMD" | grep -Eq '(components/ui/|\.env|\.claude/|\.github/workflows|tsconfig\.json|eslint\.config|vitest\.config|playwright\.config|docs/standards/|pnpm-lock\.yaml|scripts/(verify|loop|stream))'; then
    block "Refused: an inline interpreter one-liner referencing a protected path.
Use the normal tools so the guards can see what you are doing."
  fi
fi

# --- 3. contract rules ------------------------------------------------------
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])(npm|yarn)[[:space:]]+(i|install|add|ci)([[:space:]]|$)'; then
  block "Refused: this project uses pnpm. Use 'pnpm add' / 'pnpm install'."
fi
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit.*(--no-verify|-n[[:space:]]|-n$)'; then
  block "Refused: --no-verify bypasses the quality gate. Fix the failure instead."
fi
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+push.*(--force([^-]|$)|-f([[:space:]]|$))'; then
  block "Refused: force push. Use --force-with-lease and ask the user first."
fi
if printf '%s' "$CMD" | grep -Eq 'drizzle-kit[[:space:]]+push'; then
  block "Refused: 'drizzle-kit push' mutates a database without a migration file.
Use 'pnpm db:generate' then 'pnpm db:migrate'. See docs/standards/70-data-and-migrations.md."
fi
if printf '%s' "$CMD" | grep -Eiq '(DROP|TRUNCATE)[[:space:]]+(TABLE|SCHEMA|DATABASE)'; then
  block "Refused: destructive SQL. Express it as a reversible migration and have the user run it."
fi
if printf '%s' "$CMD" | grep -Eq 'vitest.*--(bail|passWithNoTests)|jest.*--passWithNoTests'; then
  block "Refused: do not weaken the test run to make it pass."
fi
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+worktree[[:space:]]+add'; then
  block "Refused: create a parallel session with 'bash scripts/stream/stream.sh new <name> <branch> <dirs>'
so the area it owns is registered. A raw worktree has no claim and collides silently.
See docs/standards/95-parallel-streams.md."
fi

exit 0
