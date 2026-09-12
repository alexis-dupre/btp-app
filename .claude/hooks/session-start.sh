#!/usr/bin/env bash
# SessionStart: put the project's real state in front of the agent, not its assumptions.
source "$(dirname "$0")/lib.sh"

echo "### Project state"
if [ -f components.json ]; then
  echo "shadcn preset in use (source of truth for every design token):"
  pnpm dlx shadcn@latest info 2>/dev/null | head -40 || echo "(run 'pnpm dlx shadcn@latest info')"
else
  echo "shadcn is NOT initialised yet. Run the bootstrap in BOOTSTRAP.md before writing UI."
fi
echo
echo "Open ADRs: $(ls docs/adr/*.md 2>/dev/null | wc -l | tr -d ' ') recorded."
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"
exit 0
