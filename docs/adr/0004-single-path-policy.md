# ADR-0004 — One path policy, enforced on every write mechanism

- **Status:** accepted
- **Date:** 2026-09-13
- **Impacts:** `.claude/hooks/**`, `90-autonomous-loops.md`, `95-parallel-streams.md`

## Context

The guards were attached to the `Edit`, `Write` and `NotebookEdit` tools. An agent working on
the Vitest setup hit the block on `vitest.config.ts`, reported it, and noted — without using
it — that `guard-bash.sh` inspected the command string but never the paths it wrote to. So
`cat > vitest.config.ts <<EOF` went straight past every path guard, as would `sed -i`, `tee`,
`cp`, `mv`, `rm` and any inline interpreter one-liner.

Every protection built so far — registry ownership, `.env`, immutable migrations, the gate
cannot edit itself, parallel-stream claims — had a marked detour through Bash. Under an
autonomous loop, where nobody watches each command, the detour would eventually be taken:
not maliciously, just as the path of least resistance when a write is refused.

## Decision

Extract the path rules into `.claude/hooks/path_policy.py`, a single policy with two entry
points: the Edit guard checks `tool_input.file_path`, and the Bash guard extracts every path
its command would write to and checks each one through the same function. Stream claims are
checked on Bash targets too.

Inline interpreters (`python -c`, `node -e`, …) cannot be parsed. The combination of an
inline interpreter and a protected path anywhere in the command is refused outright.

## Consequences

- A rule now holds regardless of how the write is attempted. That is the difference between
  a guard and a suggestion.
- Path extraction is best-effort and will never be complete — a sufficiently creative command
  can still write a file. The goal is not an unbreakable sandbox; it is that the easy path and
  the correct path are the same one, and that anything else requires deliberate circumvention
  a human would notice in the transcript.
- False positives are the real risk. `/preflight` now asserts both directions: six hostile
  commands must be refused, three ordinary ones must pass. A guard that blocks legitimate work
  gets disabled by the first person it annoys, which is worse than never having existed.
- `git worktree add` is refused in favour of `stream.sh new`, so a parallel session always has
  a registered claim.

**Signal this was wrong:** if the false-positive rate makes people reach for
`BTP_ALLOW_GATE_EDIT=1` routinely, the policy is too broad. Narrow the patterns; never widen
the escape hatch.
