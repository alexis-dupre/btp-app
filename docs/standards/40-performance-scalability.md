# Performance and scalability standard

Budgets are enforced in CI. Breaking one blocks the merge; raising one requires an ADR.

## Budgets

| Metric | Budget | Measured by |
|---|---|---|
| LCP p75, mobile | ≤ 2.5 s | Lighthouse CI on key routes |
| INP p75 | ≤ 200 ms | Lighthouse CI + RUM |
| CLS | ≤ 0.1 | Lighthouse CI |
| First-load JS per route | ≤ 180 KB gzip | `pnpm build` output + size check |
| Server action / route handler p95 | ≤ 300 ms (excl. external calls) | APM |
| Single SQL query p95 | ≤ 50 ms | `pg_stat_statements` |
| Unbounded queries | 0 | review + lint rule |

## Scale assumptions (design against these, not against today)

- 500 construction companies; largest has 400 employees and 900 active chantiers.
- 5 M `pointage` rows/year, 2 M `lignes de devis`, 400 GB of site photographs.
- Peak load is 07:00–08:00 and 16:00–18:00 on weekdays, on mobile networks.

## Rules

1. **No unbounded query.** Every list is cursor-paginated with a hard `LIMIT`. Exports go
   through a background job, never a request.
2. **No N+1.** Join, batch, or use a dataloader. Queries inside `map` are a blocking finding.
3. **Select explicitly.** Never `select *` into a page that renders four columns.
4. **Index deliberately.** Every new query pattern ships with its index and an
   `EXPLAIN (ANALYZE, BUFFERS)` in the PR. Composite indexes start with `org_id`.
5. **Cache with intent.** State for each fetch: cached or not, for how long, invalidated by
   which tag. Revalidate by tag after mutations. Financial documents are never cached stale.
6. **Images.** `next/image`, correct `sizes`, AVIF/WebP, server-side resize on upload,
   thumbnails for lists, full resolution only on demand.
7. **Client JS.** Server Components by default; `"use client"` at the leaf. Import icons
   individually. Dynamic-import heavy widgets (charts, PDF viewer, map).
8. **Heavy work is a job.** PDF generation, e-invoice transmission, imports, photo processing
   run in a queue with idempotent handlers, retries with backoff, and a dead-letter path.
9. **Degrade on bad networks.** Site screens must render usable content on a throttled
   "Fast 3G" profile. Test it, do not assume it.
