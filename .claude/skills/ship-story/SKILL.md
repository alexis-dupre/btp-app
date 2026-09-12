---
name: ship-story
description: Run the full expert pipeline for one story, from spec reading to merge-ready. Use when the user says "ship", "implement story X", or hands you a BMad story.
disable-model-invocation: true
---

# Ship one story

Argument: the story id, the path to a BMad `SPEC.md` / story file, or a plain description.

$ARGUMENTS

## Current state

- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null`
- Uncommitted: !`git status --porcelain | wc -l` files
- Specs on disk: !`ls -d docs/specs/* _bmad/specs/* specs/* 2>/dev/null | head -10`

## Pipeline — do not skip a stage, do not reorder

**0. Frame.** Delegate to `tech-lead`: restate outcome, constraints, out-of-scope, risks, and
produce the delegation plan. If anything is a guess, stop and ask the user one question.

**1. Design pass (parallel where independent).**
- `btp-domain-expert` if the story touches a domain concept — rules, states, computations,
  with sources. Its output becomes the test tables.
- `security-architect` if it touches auth, permissions, personal data, uploads or money.
- `data-modeler` if anything is persisted — schema, migration, indexes with `EXPLAIN`.
- `api-architect` for the server contract: schemas, authz predicate, errors, idempotency.
- `ux-flow-architect` then `design-system-guardian` if there is UI.

Stop here and show the user the design decisions in under 20 lines. Get a yes before building.

**2. Build.** Implementation by `frontend-implementer` and/or the contract owner. Small
commits. The `post-edit` hook typechecks every write — fix immediately, never accumulate.

**3. Test.** `test-engineer` writes the tests, including the mandatory tenant-isolation
negative test and the money boundary cases. Run them. Paste the real output.

**4. Review (parallel, read-only).** `code-reviewer`, `security-reviewer`,
`accessibility-auditor` if UI touched, `performance-engineer` if a list, dashboard, upload
or heavy page was added.

**5. Fix.** Every `BLOCKING` finding is resolved. Every `SHOULD FIX` is either resolved or
recorded as a follow-up with a reason. Re-run the reviewers that blocked.

**6. Gate.** Run `/quality-gate`. It must be green.

**7. Record.** ADR for any decision that constrains the future. Update
`docs/domain/btp-rules.md` with any rule confirmed during the story.

## Report

Finish with: what changed, what was decided and why, what was deliberately not done, and
the residual risks. No victory lap — just the facts and the open items.
