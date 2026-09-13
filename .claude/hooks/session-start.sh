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
STREAM="$(cat .btp-stream 2>/dev/null)"
if [ -n "$STREAM" ]; then
  echo
  echo "### Parallel session"
  echo "You are stream '$STREAM'. An edit is refused only inside another live stream's claim,"
  echo "or on an exclusive resource (deps, migrations, registry) held by another stream or by"
  echo "nobody. A path outside your own claim that no other stream owns is yours to edit."
  python3 scripts/stream/streams.py list 2>/dev/null | grep '^\[LIVE' || true
  python3 scripts/stream/streams.py heartbeat "$STREAM" 2>/dev/null
elif python3 scripts/stream/streams.py list 2>/dev/null | grep -q '^\[LIVE'; then
  echo
  echo "### Warning — other sessions are live"
  python3 scripts/stream/streams.py list 2>/dev/null | grep '^\[LIVE' || true
  echo "This worktree is not registered as a stream. Anything you edit in their areas will be refused."
fi
echo
echo "Open ADRs: $(ls docs/adr/*.md 2>/dev/null | wc -l | tr -d ' ') recorded."
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"
exit 0
