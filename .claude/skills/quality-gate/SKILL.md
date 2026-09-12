---
name: quality-gate
description: Run the full verification suite and report the real result. Use before declaring any work done, and before opening a pull request.
allowed-tools: Bash, Read, Grep, Glob
disable-model-invocation: false
---

# Quality gate

Run every check and report honestly. **Never summarise a failure as a success, never fix a
failure by weakening the check.** If something cannot run, say so explicitly.

## Run, in order, and paste the tail of each output

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm test:integration   # needs the local Postgres, see docs/standards/50-testing.md
pnpm test:e2e
pnpm test:a11y
pnpm audit --audit-level=high
```

## Then check what a script cannot

- `git diff --stat` — is anything in the diff outside the story's scope?
- `grep -rn "components/ui/" --include="*.tsx" -l .` — has anyone hand-edited a registry file?
  Compare with `git log --oneline -- components/ui/`.
- Any new `any`, `@ts-expect-error`, `eslint-disable`, or `.skip(` in the diff.
- Any new tenant-scoped query without an `orgId` scope.
- Bundle: read the route sizes from the `pnpm build` output against the budgets in
  `docs/standards/40-performance-scalability.md`.

## Report

```
GATE: PASS | FAIL
typecheck   ✓/✗   lint ✓/✗   unit ✓/✗   build ✓/✗
integration ✓/✗   e2e  ✓/✗   a11y ✓/✗   audit ✓/✗
Manual checks: <findings or "none">
Blocking: <list, or "none">
```
