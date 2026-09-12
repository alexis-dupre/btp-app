#!/usr/bin/env bash
# PreToolUse (Bash): refuse commands that break the project's contracts.
source "$(dirname "$0")/lib.sh"

CMD="$(hook_field '.tool_input.command')"
[ -z "$CMD" ] && exit 0

# Package manager is pnpm, everywhere, always.
if printf '%s' "$CMD" | grep -Eq '(^|[;&|[:space:]])(npm|yarn)[[:space:]]+(i|install|add|ci)([[:space:]]|$)'; then
  block "Refused: this project uses pnpm. Use 'pnpm add' / 'pnpm install'."
fi

# Never bypass the local gate.
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit.*(--no-verify|-n[[:space:]]|-n$)'; then
  block "Refused: --no-verify bypasses the quality gate. Fix the failure instead."
fi
if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+push.*(--force([^-]|$)|-f([[:space:]]|$))'; then
  block "Refused: force push. Use --force-with-lease and ask the user first."
fi

# Destructive schema operations need a human.
if printf '%s' "$CMD" | grep -Eq 'drizzle-kit[[:space:]]+push'; then
  block "Refused: 'drizzle-kit push' mutates a database without a migration file.
Use 'pnpm db:generate' then 'pnpm db:migrate'. See docs/standards/70-data-and-migrations.md."
fi
if printf '%s' "$CMD" | grep -Eiq '(DROP|TRUNCATE)[[:space:]]+(TABLE|SCHEMA|DATABASE)'; then
  block "Refused: destructive SQL. Express it as a reversible migration and have the user run it."
fi

# Tests must not be silenced.
if printf '%s' "$CMD" | grep -Eq 'vitest.*--(bail|passWithNoTests)|jest.*--passWithNoTests'; then
  block "Refused: do not weaken the test run to make it pass."
fi

exit 0
