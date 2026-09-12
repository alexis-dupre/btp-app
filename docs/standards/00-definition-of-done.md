# Definition of done

A change is done when every line below is true. Not "mostly true". This is the contract the
`tech-lead` subagent enforces and the CI gate proves.

## Functional
- [ ] The behaviour matches the spec, and the spec was read, not assumed.
- [ ] Every state is handled: empty, loading, partial, error, offline, permission-denied.
- [ ] Nothing in the diff is outside the story's scope.

## Correctness
- [ ] `pnpm verify` is green locally and in CI.
- [ ] Tests prove the behaviour and fail if the behaviour is broken.
- [ ] A tenant-isolation negative test exists for every tenant-scoped resource touched.
- [ ] Every money computation has boundary tests (zero, rounding, maximum, negative).
- [ ] A bug fix has a regression test written before the fix.

## Design
- [ ] Only shadcn registry components and preset tokens. No hand-edited `components/ui/**`.
- [ ] Verified in light and dark themes, at 360 px and at 1440 px.
- [ ] WCAG 2.2 AA: keyboard path, accessible names, contrast, focus visible.

## Security
- [ ] Authorisation is explicit at the entry point; the org scope comes from the session.
- [ ] Input validated with the shared Zod schema at the boundary.
- [ ] No secret, token or personal data in logs, errors or the client bundle.
- [ ] `security-reviewer` returned no BLOCKING finding.

## Performance
- [ ] No unbounded query; every list is paginated.
- [ ] New queries have an index and an `EXPLAIN (ANALYZE)` in the PR.
- [ ] Route budgets in `40-performance-scalability.md` are respected.

## Operability
- [ ] Migration is backward compatible with the currently deployed code.
- [ ] Errors are observable: structured log with request id and org id, no personal data.
- [ ] Feature flag or rollback path for anything risky.

## Traceability
- [ ] An ADR exists for every decision a future maintainer would otherwise reverse-engineer.
- [ ] Any French regulatory rule used is recorded in `docs/domain/btp-rules.md` with a source
      and a date.
- [ ] The PR description states what changed, what was decided, and what was not done.
