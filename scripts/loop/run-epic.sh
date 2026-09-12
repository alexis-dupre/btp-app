#!/usr/bin/env bash
# Autonomous epic runner.
#
#   scripts/loop/run-epic.sh <spec-folder> [--max N] [--from <story-id>] [--dry-run]
#
# One bmad-build-auto worker per story, in manifest order, in a dedicated git worktree.
# After every story the loop runs OUR gate itself — it never trusts the worker's own
# verdict. Blocked stories and gate failures stop the run and land in the escalation file.
set -uo pipefail

SPEC="${1:?usage: run-epic.sh <spec-folder> [--max N] [--from ID] [--dry-run]}"; shift
MAX="${BTP_LOOP_MAX_STORIES:-8}"
MAX_BLOCKS="${BTP_LOOP_MAX_CONSECUTIVE_BLOCKS:-2}"
FROM=""; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --max) MAX="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

LEDGER="docs/backlog/loop-ledger.md"
ESCALATION="docs/backlog/escalations.md"
DEFERRED="docs/backlog/deferred.md"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
mkdir -p docs/backlog

log() { printf '[loop %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
ledger() { printf '%s\n' "$*" >> "$LEDGER"; }

# --- preconditions -----------------------------------------------------------
command -v claude >/dev/null || { echo "claude CLI not found"; exit 1; }
[ -f "$SPEC/stories.yaml" ] || { echo "no stories.yaml in $SPEC"; exit 1; }
[ -f "$SPEC/SPEC.md" ]      || { echo "no SPEC.md in $SPEC"; exit 1; }
if ! git diff --quiet HEAD || ! git diff --cached --quiet; then
  echo "Working tree is dirty. bmad-build-auto requires a clean tree. Commit or stash first."
  exit 1
fi
log "gate self-check before starting"
pnpm run -s verify:fast >/dev/null 2>&1 || { echo "The gate is already red on a clean tree. Fix that first."; exit 1; }

IDS="$(python3 scripts/loop/story_state.py ids "$SPEC")"
[ -n "$FROM" ] && IDS="$(printf '%s\n' "$IDS" | sed -n "/^${FROM}$/,\$p")"

ledger ""
ledger "## Run $RUN_ID — $SPEC (max $MAX stories)"
ledger ""

count=0; blocks=0
for SID in $IDS; do
  [ "$count" -ge "$MAX" ] && { log "story budget reached ($MAX). Stopping."; break; }

  # Human checkpoints declared in our policy file take precedence over autonomy.
  if grep -q "^checkpoint: *$SID$" scripts/loop/policy.txt 2>/dev/null; then
    log "story $SID is a human checkpoint. Stopping for review."
    ledger "- **$SID** — halted: human checkpoint declared in policy.txt"
    break
  fi

  count=$((count+1))
  log "dispatching story $SID ($count/$MAX)"
  if [ "$DRY" = "1" ]; then ledger "- $SID — dry run"; continue; fi

  BEFORE="$(git rev-parse HEAD)"

  # acceptEdits, not bypassPermissions: the deny rules in .claude/settings.json and every
  # hook still apply inside this run. That is the whole point.
  claude -p "/bmad-build-auto $SPEC $SID" \
      --permission-mode acceptEdits \
      --append-system-prompt "You are running unattended. Follow CLAUDE.md and docs/standards/90-autonomous-loops.md. If anything is ambiguous, halt blocked with the reason — never guess." \
      > "docs/backlog/.loop-$RUN_ID-$SID.log" 2>&1
  WORKER_RC=$?

  read -r STATUS BLOCKING BASELINE <<<"$(python3 scripts/loop/story_state.py status "$SPEC" "$SID" | tr '|' ' ')"
  log "story $SID -> status=$STATUS rc=$WORKER_RC"

  case "$STATUS" in
    done)
      # Independent verification. The worker's own review is not evidence.
      log "running the full gate on $SID"
      if pnpm run -s verify > "docs/backlog/.gate-$RUN_ID-$SID.log" 2>&1; then
        ledger "- **$SID** — done, gate green (\`$BEFORE..$(git rev-parse HEAD)\`)"
        blocks=0
      else
        ledger "- **$SID** — done per worker but **GATE RED**. See .gate-$RUN_ID-$SID.log"
        {
          echo "## $RUN_ID / $SID — gate red after a 'done' story"
          echo "Commits: \`$BEFORE..$(git rev-parse HEAD)\`"
          echo '```'
          tail -40 "docs/backlog/.gate-$RUN_ID-$SID.log"
          echo '```'
          echo
        } >> "$ESCALATION"
        log "STOPPING: the worker declared done on a red tree."
        break
      fi ;;
    blocked)
      blocks=$((blocks+1))
      ledger "- **$SID** — blocked: $BLOCKING"
      {
        echo "## $RUN_ID / $SID — blocked: $BLOCKING"
        echo "Story file: $SPEC/stories/$SID-*.md"
        echo "Worker log: docs/backlog/.loop-$RUN_ID-$SID.log"
        echo
      } >> "$ESCALATION"
      if [ "$blocks" -ge "$MAX_BLOCKS" ]; then
        log "STOPPING: $blocks consecutive blocked stories. The spec is the problem, not the code."
        break
      fi ;;
    *)
      ledger "- **$SID** — unexpected status '$STATUS'. Stopping."
      log "STOPPING: unexpected status '$STATUS'."
      break ;;
  esac
done

# Collect review findings the workers deliberately deferred.
{ echo; echo "## Collected $RUN_ID"; python3 scripts/loop/story_state.py deferred "$SPEC"; } >> "$DEFERRED"

log "run finished. Ledger: $LEDGER · Escalations: $ESCALATION · Deferred: $DEFERRED"
