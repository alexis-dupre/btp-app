#!/usr/bin/env bash
# PreToolUse (Edit|Write|NotebookEdit): refuse edits to files the agent must not own.
source "$(dirname "$0")/lib.sh"

FILE="$(hook_field '.tool_input.file_path')"
[ -z "$FILE" ] && exit 0

case "$FILE" in
  */components/ui/*|components/ui/*)
    block "Refused: components/ui/** is owned by the shadcn registry.
Regenerate it with 'pnpm dlx shadcn@latest add <component> --overwrite', or create a
wrapper in components/<feature>/ that composes the primitive. See docs/standards/20-design-system.md." ;;
  *.env|*.env.*|*/.env|*/.env.*)
    block "Refused: environment files are never edited by an agent. Ask the user to set the variable, and document it in .env.example." ;;
  *pnpm-lock.yaml|*package-lock.json|*yarn.lock)
    block "Refused: lockfiles are generated. Run the package manager instead." ;;
  */node_modules/*|*/.next/*|*/dist/*|*/build/*)
    block "Refused: generated or vendored directory." ;;
esac

# Applied migrations are immutable: fix forward with a new migration.
case "$FILE" in
  */drizzle/*.sql|drizzle/*.sql|*/migrations/*.sql|migrations/*.sql)
    if [ -f "$FILE" ]; then
      block "Refused: '$FILE' already exists. Applied migrations are immutable.
Create a new migration that fixes forward. See docs/standards/70-data-and-migrations.md."
    fi ;;
esac

exit 0
