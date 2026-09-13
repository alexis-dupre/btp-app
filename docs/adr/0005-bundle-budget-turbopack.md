# ADR-0005 — Bundle budget measured from Turbopack's manifests, in gzip

- **Status:** accepted
- **Date:** 2026-09-13
- **Impacts:** `scripts/check-bundle-budget.mjs`, `scripts/verify.sh`,
  `.github/workflows/quality-gate.yml`, `40-performance-scalability.md`

## Context

`scripts/check-bundle-budget.mjs` read `.next/app-build-manifest.json` and exited 1 with
"not found. Run 'pnpm build' first." It said that immediately after a successful build,
every time, locally and in the `build-and-integration` CI job. The file was never missing
because the build had not run — Next 16 with Turbopack does not emit it at all.

Its header carried the instruction "adjust the parser to your Next.js version the first
time you run it, then never touch it again." That never happened. The stage had, as far as
the history shows, never once passed, so the 180 KB budget in
`docs/standards/40-performance-scalability.md` had never actually been enforced on anything.

Two further facts came out of fixing it:

- `.next/build-manifest.json` does exist under Turbopack, but its `pages` key holds the
  **pages-router** map — here, `{"/_app": []}`. Reading it for app-router routes yields an
  empty set and therefore 0 KB, which would have passed the budget while measuring nothing.
  That failure mode is worse than the crash, because it is silent.
- The old script summed `statSync().size` — raw bytes. The standard says **gzip**. Its unit
  was wrong independently of its path being wrong.

## Decision

Reassemble first-load JS per app route from the manifests Turbopack does emit, and compare
gzipped bytes against the 180 KB budget:

| Part | Source |
|---|---|
| route list | `.next/app-path-routes-manifest.json`, keys ending `/page` |
| shared runtime | `.next/server/app/<route>/build-manifest.json` -> `rootMainFiles` |
| route-specific | `.next/server/app/<route>_client-reference-manifest.js` -> `entryJSFiles` |

`entryJSFiles` is genuinely per-route, which is what makes this worth doing: `/` carries a
chunk `/_not-found` does not. Sizes are `gzipSync` at the default level, which is slightly
larger than what a CDN at level 9 will serve — the budget errs toward being strict.

Three deliberate exclusions, each visible in the output rather than folded in silently:

- **Polyfills** (`polyfillFiles`) are served `nomodule`. No browser we support downloads
  them, and Next's own First Load JS figure excludes them.
- **CSS** is not JS. The budget line says "first-load JS per route".
- **Route handlers** (`/favicon.ico/route`) ship no client JS.

Any manifest that is absent, unparseable, or not the shape above exits **2** with
"cannot measure", never 0. A budget check that cannot find its input must not be
indistinguishable from a budget check that passed.

## Consequences

- The budget is enforced for the first time. Current headroom is real but not large:
  `/` is 134.7 KB against 180 KB, and 126.7 KB of that is the shared runtime every route
  pays before any feature code exists. The first heavy client component will be felt.
- Because the shared runtime dominates, a regression will usually show up on every route
  at once rather than on the route whose story caused it. Read the `shared runtime` line,
  not just the total.
- The script now depends on two internal Next.js artefacts. `__RSC_MANIFEST` and
  `entryJSFiles` are not public API and can change in a minor release. This is accepted
  because the alternative — trusting the build log — is worse: Next 16's Turbopack build
  output prints no per-route size column at all, which is why nobody noticed the stage
  was dead.
- `pnpm verify` and the `build-and-integration` CI job now fail on a real over-budget
  route, so a story that ships a large dependency will be blocked at the gate rather than
  in review.

**Signal this was wrong:** an exit 2 after a routine `next` upgrade means the manifest
shape moved — fix the parser and update this ADR together; do not soften the exit to 0 to
get CI green. If a route's measured figure ever diverges noticeably from what DevTools
reports as transferred JS on first load, the chunk set here is incomplete and the
reassembly, not the budget, is what needs revisiting.
