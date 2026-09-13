# ADR-0006 — Offline support deferred, optionality preserved

- **Status:** proposed
- **Date:** 2026-09-13
- **Deciders:** Alexis Dupré
- **Impacts:** `10-architecture.md`, every client-side decision

## Context

The product's primary users work on construction sites: unreliable mobile coverage,
interrupted work, one hand free. That makes offline capability plausibly important —
timesheets (`pointage`), site photos and progress readings for a `situation` are all
captured on site.

But it is not established that it is *needed*. Nobody has yet answered: which actions
actually happen with no network, how often, what today's process is (paper re-entered at
the office may already be the real workflow), and what a lost entry costs. A lost
`pointage` is a wrong payslip; a lost photo is an annoyance. Those demand different
architectures.

Building offline-first before knowing this would be expensive speculation: local-first
storage, conflict resolution and a sync protocol are not features that can be bolted on,
and they are not features that can be removed either.

## Decision

**Defer the decision. Do not build offline support now. Keep it cheap to add later.**

Three constraints hold until this ADR is superseded. Each costs close to nothing today and
is what makes retrofitting possible rather than a rewrite:

1. **Every mutation goes through one layer.** No component, page or route handler mutates
   directly. A queue, a retry or an optimistic layer can then be inserted in one place.
2. **No business logic in components.** Domain rules live in `lib/domain/` and stay pure —
   already required by `10-architecture.md`. A rule that must run on the client later can
   only do so if it has no I/O.
3. **Client-generated identifiers.** Entities get a UUID v7 at creation time, client-side,
   not a server sequence. An entity created offline must be referenceable before the server
   has ever seen it. This is the one constraint that is genuinely hard to add afterwards.

No service worker, no local database, no sync protocol, no conflict resolution.

## Consequences

- The product ships as a normal web application. Losing connectivity means losing the app,
  and the UI must say so plainly rather than failing silently — that is a real product
  limitation, not a neutral one.
- The three constraints are cheap now. If any of them starts being argued against for
  convenience, that argument is also an argument for closing this door — raise it here
  rather than settling it in a pull request.
- **What would reopen this:** a pilot customer reporting real data loss or refusal to use the
  product on site; or a competitor's offline capability deciding a deal. Answer the four
  questions in Context first — the answers decide between a read-only cache and durable
  queued writes, which are very different amounts of work.
- **Signal this was wrong:** if timesheets are being re-entered at the office from paper
  because the app was unusable on site, the deferral cost more than it saved.
