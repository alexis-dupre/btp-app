# Parallel streams standard

Several Claude Code sessions can run at once, each in its own git worktree, on its own
branch, owning a declared set of directories. This document is the contract that keeps them
from producing a coherent-looking mess.

## The failure mode this prevents

Parallel sessions do not collide on git. Git is good at merging. They collide on **meaning**:

- two streams each generate a migration — both apply, in an order nobody chose;
- two streams add a column to the same table — the merge is clean, the schema is wrong;
- two streams each add a dependency — the lockfile merges, one version silently wins;
- two streams both re-run `shadcn apply` — the last one decides the design system.

None of these show up as a conflict. They show up three weeks later as a bug nobody can
reproduce. So the boundary is enforced mechanically, at write time, not by discipline.

## The model

| Concept | What it is |
|---|---|
| **Stream** | One session = one worktree = one branch = one name |
| **Claim** | The directories that stream owns. Directories, never globs. |
| **Exclusive resource** | `deps`, `migrations`, `registry` — global by nature, one holder at a time |
| **Registry** | `$(git rev-parse --git-common-dir)/btp-streams/*.json`, shared by all worktrees, never committed |

The registry is deliberately unversioned. It is ephemeral coordination state; committing it
would create exactly the conflicts it exists to prevent.

## Commands

```bash
bash scripts/stream/stream.sh new devis feat/devis lib/domain/devis "app/(app)/devis"
bash scripts/stream/stream.sh claim migrations
bash scripts/stream/stream.sh list
bash scripts/stream/stream.sh release devis --force
bash scripts/stream/stream.sh gc
```

`new` registers the claim **before** creating the worktree, so an overlapping claim creates
nothing. It also writes `.btp-stream` (gitignored) into the worktree and runs `pnpm install`,
since a worktree has no `node_modules` of its own.

## Enforcement

`guard-stream.sh` runs on every `Edit`/`Write`:

- the path falls inside another live stream's claim → refused;
- the path maps to an exclusive resource held by someone else → refused;
- the path maps to an exclusive resource nobody holds → refused, with the command to claim it.

A stream is **live** while its worktree exists and its heartbeat is under six hours old
(`BTP_STREAM_TTL_HOURS`). Heartbeats are written on session start and on every edit, so a
crashed session stops blocking others by itself.

When no stream is registered at all, the hook does nothing. Single-session work is unaffected.

## How to cut claims

Cut along **domain seams**, not layers. `lib/domain/devis` + `app/(app)/devis` + `lib/db/devis`
is one good stream. `all the backend` and `all the frontend` is two bad ones — they touch the
same features and will fight over every shared type.

Too broad blocks everyone. Too narrow gets the session refused mid-work and tempts someone
into widening the claim rather than rethinking the split. If you cannot state the claim in
three directories, the work is not yet one stream.

## Rules

1. **Two streams maximum at first.** Coordinating three parallel sessions is a skill; acquire
   it on two. Every stream is also a code review you owe yourself.
2. **Never run two streams on the same epic.** Stories inside an epic share assumptions and
   are ordered. Parallelise across epics, or across clearly disjoint features.
3. **Migrations are serial, always.** One stream holds `migrations` at a time, full stop.
   Numbering and ordering cannot be reconciled after the fact.
4. **Release only after the merge.** Releasing early lets another stream claim your area while
   your branch is still unmerged — the exact situation the registry prevents.
5. **Rebase before merging**, and run the full `pnpm verify` on the rebased result. Each stream
   was green against a base that has since moved.
6. **A refusal from `guard-stream.sh` is correct.** Do not work around it, do not widen a claim
   to make it go away. Say which stream should own the file and let the user decide.

## With autonomous loops

A loop is a stream. `run-epic.sh` requires a clean tree and commits per story, which composes
naturally with worktrees: one epic per stream, each with its own claim. Never run two loops
that could touch the same area — an unattended worker cannot ask you to arbitrate, so it
halts, and you lose the run.
