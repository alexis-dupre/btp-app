#!/usr/bin/env bash
# Parallel Claude Code sessions, one per git worktree, with overlap protection.
#
#   stream.sh new <name> <branch> <claim-dir> [more-claim-dirs...]
#   stream.sh claim <resource>      # deps | migrations | registry
#   stream.sh list
#   stream.sh release <name> [--force]
#   stream.sh gc
#
# Each worktree carries a .btp-stream file naming its stream. Hooks read it, so a
# session physically cannot edit an area another live session owns.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not in a git repo"; exit 1; }
PY="python3 $ROOT/scripts/stream/streams.py"
CMD="${1:-}"; shift || true

case "$CMD" in
  new)
    NAME="${1:?stream name, e.g. auth}"; BRANCH="${2:?branch, e.g. feat/auth}"; shift 2
    [ $# -ge 1 ] || { echo "declare at least one directory this stream owns, e.g. lib/auth"; exit 1; }
    PARENT="$(dirname "$ROOT")"
    WT="$PARENT/$(basename "$ROOT")-$NAME"
    [ -e "$WT" ] && { echo "worktree $WT already exists"; exit 1; }

    CLAIMS=(); for c in "$@"; do CLAIMS+=(--claim "$c"); done
    # Register first: if the claim overlaps a live stream, nothing is created.
    $PY start "$NAME" --branch "$BRANCH" --worktree "$WT" "${CLAIMS[@]}" || exit 1

    git worktree add -b "$BRANCH" "$WT" HEAD || { $PY release "$NAME" --force; exit 1; }
    echo "$NAME" > "$WT/.btp-stream"
    grep -qxF '.btp-stream' "$ROOT/.gitignore" 2>/dev/null || echo '.btp-stream' >> "$ROOT/.gitignore"

    # A worktree has no node_modules of its own.
    ( cd "$WT" && pnpm install --frozen-lockfile >/dev/null 2>&1 ) \
      && echo "dependencies installed" || echo "run 'pnpm install' in the worktree"

    cat <<TXT

Stream '$NAME' ready.

  cd $WT
  claude

That session owns: $*
It is blocked from editing anything owned by another live stream.

When the branch is merged:
  bash scripts/stream/stream.sh release $NAME --force
  git worktree remove $WT
TXT
    ;;

  claim)
    RES="${1:?deps | migrations | registry}"
    S="$(cat "$ROOT/.btp-stream" 2>/dev/null)"
    [ -n "$S" ] || { echo "this worktree has no .btp-stream file — it is not a stream"; exit 1; }
    $PY claim "$RES" --stream "$S"
    ;;

  list)    $PY list ;;
  release) $PY release "$@" ;;
  gc)      $PY gc ;;
  *)       sed -n '2,12p' "$0" ;;
esac
