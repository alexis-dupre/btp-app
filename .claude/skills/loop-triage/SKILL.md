---
name: loop-triage
description: Triage the output of autonomous runs — escalations, deferred findings and the ledger. Use at the start of a session after a loop has run.
disable-model-invocation: true
---

# Loop triage

Open escalations: !`grep -c '^## ' docs/backlog/escalations.md 2>/dev/null || echo 0`
Deferred findings: !`grep -c '^- ' docs/backlog/deferred.md 2>/dev/null || echo 0`
Last run: !`grep '^## Run' docs/backlog/loop-ledger.md 2>/dev/null | tail -1`

Ten minutes of human attention, spent where it pays.

## 1. Escalations first

For each entry in `docs/backlog/escalations.md`, decide one of:

- **Fix the spec** — the intent was ambiguous. Edit `SPEC.md`, delete the blocked story file
  (a blocked story file is permanent; the id only reads as pending again once it is gone),
  re-dispatch.
- **Fix the standard** — the worker did something our rules allow but should not. Change the
  standard and, where possible, add a check that would have blocked it. This is the only way
  the system gets better instead of just faster.
- **Split the story** — it did not converge. Two smaller stories.
- **Take it yourself** — some things should never have been unattended. Note why, and add the
  id to `scripts/loop/policy.txt` so the class of work is a checkpoint from now on.

Mark each entry resolved with one line and the date. Do not delete the history — the pattern
of what blocks is the most valuable diagnostic you have.

## 2. Deferred findings

Triage each into: fix in the next story, create a ticket, or discard with a written reason.
A deferred list that only grows means the loop is producing debt faster than you retire it —
that is a signal to slow down, not to keep going.

## 3. The meta-question

Look at the last three runs. Is the blocked rate falling? If it is rising, the specs are
getting thinner or the stories are getting bigger. Say so plainly.
