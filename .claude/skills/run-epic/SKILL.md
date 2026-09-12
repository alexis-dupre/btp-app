---
name: run-epic
description: Orchestrate an epic autonomously — dispatch one bmad-build-auto worker per story, verify each result independently, and escalate. Use when the user wants several stories built without being prompted each time.
disable-model-invocation: true
---

# Run an epic autonomously

Spec folder: $ARGUMENTS

Tree: !`git status --porcelain | wc -l` uncommitted files · HEAD !`git rev-parse --short HEAD 2>/dev/null`

## Before you dispatch anything

Refuse to start unless all of these hold, and say which one failed:

1. `<spec-folder>/SPEC.md` and `<spec-folder>/stories.yaml` both exist.
2. The working tree is clean. `bmad-build-auto` requires it and reverts to a baseline on halt.
3. `pnpm verify:fast` is green **now**. Starting a loop on a red tree makes every result
   unreadable.
4. The first two stories of this epic were built with a human in the loop (`/ship-story`).
   Autonomy copies patterns; it must copy patterns you have approved.
5. Every story touching auth, tenancy, money, a migration on populated tables, or a
   regulatory rule is listed in `scripts/loop/policy.txt` as a checkpoint.

If 4 or 5 is not satisfied, say so and propose the checkpoint list instead of starting.

## Then run it

```bash
bash scripts/loop/run-epic.sh <spec-folder> --max 6
```

Do not reimplement the loop in-conversation. The script exists so the run survives a
context compaction, a crash and a closed laptop. Your job is to read its output.

## Your job while it runs and after

Read, in this order:

1. `docs/backlog/loop-ledger.md` — what actually happened, story by story.
2. `docs/backlog/escalations.md` — every halt. For each one, classify:
   - **intent gap** → the spec was ambiguous. Fix `SPEC.md`, not the code. A patch of the
     attempted change is saved; read it, it tells you which reading the worker took.
   - **gate red after "done"** → the worker's own review missed something. This is the most
     important signal in the whole system: read the diff, find what the reviewers do not
     catch, and strengthen the standard or the check — not just this story.
   - **verification failed / non-convergence** → the story was too big. Split it.
3. `docs/backlog/deferred.md` — real findings the workers set aside. Triage into: fix now,
   ticket, or discard with a reason. Never leave it to grow silently.

## Report

Stories attempted / done / blocked, the commit range, every escalation with its
classification, and one recommendation: continue, fix the spec, or shrink the stories.
Never report a run as successful because it finished — report it on the gate.
