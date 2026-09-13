---
name: stream
description: Start, inspect or end a parallel work stream — an isolated git worktree with its own Claude Code session and claimed areas. Use when the user wants to work on several branches at once.
disable-model-invocation: true
---

# Parallel streams

Live streams right now: !`python3 scripts/stream/streams.py list 2>/dev/null || echo "none"`
This worktree: !`cat .btp-stream 2>/dev/null || echo "(not a stream — main worktree)"`

$ARGUMENTS

## Starting one

```bash
bash scripts/stream/stream.sh new <name> <branch> <dir-it-owns> [more-dirs...]
```

Before running it, decide the claim with the user and get it right — a claim that is too
broad blocks other streams, one that is too narrow gets the session refused mid-work. Claims
are directories, not globs. Good: `lib/auth`, `app/(auth)`, `lib/domain/devis`. Bad: `lib`,
`app`, `.`.

Refuse to start a stream when:

- its area overlaps a live stream's claim — the registry will refuse anyway, but say why first;
- the work needs a migration, a dependency change or a preset change *and* another stream
  already holds that exclusive resource;
- the user has not said which branch this merges into.

## While a stream runs

Edits outside the claim are refused by `guard-stream.sh`. That refusal is correct — do not
work around it. Tell the user which stream should own the file, and let them decide.

For a shared resource, claim it first and it is yours until the stream ends:

```bash
bash scripts/stream/stream.sh claim deps        # package.json, lockfile
bash scripts/stream/stream.sh claim migrations  # drizzle/, migrations/, schema
bash scripts/stream/stream.sh claim registry    # components.json, globals.css
```

Only one stream holds a resource at a time. If someone else holds it, wait or ask the user —
never edit around it.

## Ending one

```bash
bash scripts/stream/stream.sh release <name> --force
git worktree remove ../<repo>-<name>
```

Do this **after** the branch is merged, never before: releasing early lets another stream
claim the same area while yours is still unmerged.

`bash scripts/stream/stream.sh gc` clears streams whose worktree is gone or whose session
died. Run it when a claim looks stuck.

## The rule behind all of this

Parallel sessions do not collide on git — they collide on meaning. Two streams each adding a
migration, or each editing the same schema, merge cleanly and produce something nobody
designed. The registry exists so that is impossible rather than merely discouraged.
