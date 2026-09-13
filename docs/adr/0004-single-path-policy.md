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

## Amendment 2026-09-13 — the first false positive, and what it cost

The signal above fired, once, in the shape the ADR predicted.

**What happened.** A session writing `docs/specs/spec-e0-walking-skeleton/stories.yaml` through
a shell heredoc was refused by section 3: the file's content contained the string
`drizzle-kit push`, inside a note _instructing a future agent not to run it_. The guard matched
on the whole command string, heredoc body included, so a document that names a banned command
was treated as a command. The writing agent was not trying to run anything; the correct path
was refused for describing itself.

**Remedy: narrow the pattern.** `path_policy.py` gains a `strip-heredocs` mode, and
`guard-bash.sh` runs the section 3 contract rules against the stripped string. A heredoc body is
data being written to a file, not a command being run. Two properties are kept deliberately:

1. **Section 1 still sees the full command.** The redirection target — the thing that decides
   whether a protected path is being written — sits outside the body. Stripping it there would
   have re-opened the hole this ADR exists to close.
2. **An unterminated heredoc fails closed.** If the terminator is not found, the body would
   swallow the rest of the command and hide a real banned invocation after it, so the rules
   scan the whole string instead.

**Verified both directions**, as the original decision requires: eleven existing `/preflight`
assertions pass unchanged before and after; ten new cases go from 8/10 to 10/10. The new cases
include the two that matter in opposite directions — a banned command _named inside_ a heredoc
body is now allowed, and a banned command placed _after_ a heredoc terminator is still refused.

**A second, more serious finding, not yet fixed.** While diagnosing this, a write to
`docs/standards/10-architecture.md` — a protected path — succeeded through
`python3 - <<'PY'` … `PY`, opening the file from inside the script. Neither guard saw it:
`targets()` extracts shell redirections and finds none, and section 2 only refuses an inline
interpreter invoked with `-c` or `-e`. Reading the program from **stdin** is the same escape
with different syntax, and it is not covered. The edit itself was authorised by the user, but
the mechanism was not — this is precisely the marked detour the ADR was written to close, taken
by accident rather than by intent, which is exactly how it predicted such things would be taken.

The narrow fix is to extend section 2's interpreter pattern to a bare `-` operand and to a
heredoc feeding an interpreter's stdin. It is left open here rather than bundled into the
false-positive fix, because widening a refusal and narrowing one should not ride in on the same
change: one of them makes the guard stricter, and it deserves its own self-test in both
directions.
