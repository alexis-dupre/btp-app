# Backlog and loop output

Written by the autonomous loop. Read by a human, at the start of a session.

| File | What it is |
|---|---|
| `loop-ledger.md` | One line per story dispatched: status, gate verdict, commit range |
| `escalations.md` | Every halt, with the worker log and the story file to look at |
| `deferred.md` | Review findings the workers judged real but out of scope |
| `.loop-*.log`, `.gate-*.log` | Raw worker and gate output. Gitignored; keep for a week. |

Nothing here is a to-do list you can leave to grow. `/loop-triage` exists so it does not.
