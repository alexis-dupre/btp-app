---
id: SPEC-{slug}
companions: []     # files downstream MUST read alongside SPEC.md. Paths may point inside the spec folder (spec-authored) or outside it (adopted from an upstream skill).
sources: []        # files fully absorbed into the SPEC (audit only; downstream does NOT read these). Never the memlog.
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# {Spec Title}

## Why

{One paragraph naming the force behind this work. A spec can exist for any of:
  - **a pain to solve** — a user or operator is stuck on a specific gap;
  - **an opportunity to capture** — something newly possible we want to claim;
  - **a vision to realize** — a thing we want to make exist because we want it to exist;
  - **a mandate to meet** — a regulation, deprecation, deadline, or contractual obligation.

Name which (or which combination) applies, who is affected, and the backdrop that makes it matter now. This is the anchor every downstream trade-off resolves against.}

## Capabilities

- **CAP-1**
  - **intent:** {One sentence. "User or system can do X to achieve Y." WHAT, not HOW.}
  - **success:** {Testable or demonstrable criterion. Something a test or a real demonstration can decide.}

## Constraints

- {A non-negotiable that bends design. If it doesn't rule anything out, it doesn't belong.}

## Non-goals

<!-- REQUIRED, non-empty. This IS the spec's explicit out-of-scope section — the project
     standard that every spec state what it is not doing is satisfied here and nowhere else.
     Do not add a second "Out of scope" heading. Name the adjacent things a reader would
     reasonably assume are included: neighbouring screens, roles not covered, states not
     handled, integrations deferred. "Nothing" is never a valid answer. -->

- {Explicit out-of-scope item. At least one. Stops downstream from filling the vacuum.}

## Success signal

- {One or two sentences. World-change moment, not dashboard. Concrete enough to write a test or run a demonstration against.}

## Tenant isolation impact

<!-- REQUIRED. Multi-tenant isolation is a correctness property, not a feature
     (docs/standards/30-security.md). Answer for this spec specifically; "no impact" is a
     claim that must be justified, not a default. -->

- **New or altered persisted data:** {Each table/collection this spec adds or changes, and
  the organisation-scoping column it carries. If a new table has no org column, say why it
  is genuinely global — that is an ADR-level decision, not a spec-level one.}
- **Read paths:** {Every query this spec introduces, and where the organisation filter comes
  from. It comes from the session, never from a request parameter, a header, or a path
  segment the client controls.}
- **Write paths:** {Where the organisation is stamped on insert, and what stops a caller
  writing a row into another organisation.}
- **Cross-tenant surfaces:** {Anything deliberately spanning organisations — sub-contractor
  access, group-level reporting, support tooling. Each one is a named exception with its own
  authorisation predicate below. If there are none, state "none".}
- **Negative test named here:** {The test that proves isolation by failing to read or write
  across organisations. Name it. `test-engineer` writes it; without it this section is
  incomplete.}

## Authorisation

<!-- REQUIRED, one row per NEW OR CHANGED operation introduced by this spec — every server
     action, route handler, mutation and non-trivial read. The predicate is a boolean
     expression over the session and the target resource, precise enough to implement and to
     test directly. "Only managers" is not a predicate. -->

| Operation | Actor(s) allowed | Authorisation predicate | On denial |
|---|---|---|---|
| {`createSituation`} | {`conducteur_travaux`, `admin`} | {`session.orgId == chantier.orgId && session.role in (...) && chantier.status == 'active'`} | {404 not 403 — do not leak existence across organisations} |

- **Default:** anything not listed above is denied. If this spec adds an operation that is
  intentionally unauthenticated, name it here and say why.
- **Ownership:** `security-architect` owns this section. Disagreement about a predicate is
  resolved by `security-architect`, per CLAUDE.md.

## Performance budget

<!-- REQUIRED whenever this spec adds or materially changes a list, a table, a dashboard, a
     search, an upload or any new page. Budgets are enforced in CI, not discussed in review
     (docs/standards/40-performance-scalability.md). If this spec adds no list and no page,
     write "No new list or page." and nothing else. -->

| Surface | Realistic volume | p95 budget | Query budget | Payload budget |
|---|---|---|---|---|
| {Chantier list} | {500 chantiers / org, 50 per page} | {< 400 ms server} | {≤ 2 queries, no N+1} | {< 120 KB JS delta} |

- **Volume basis:** {Where the "realistic volume" number comes from. A guess is an
  `open_questions[]` entry, not a budget.}
- **Degradation:** {What the surface does at 10× the expected volume — paginate, virtualise,
  refuse, or degrade. Silence here means the page falls over on the biggest customer.}
- **On-site conditions:** {Phone, gloves, sunlight, flaky or absent network. What this
  surface does offline or on a slow connection.}

## BTP rules applicability

<!-- REQUIRED. Every French regulatory or business rule this spec depends on, drawn from
     docs/domain/btp-rules.md by its R-number. French regulatory rules are not guesses
     (CLAUDE.md): a rule that is not in that register must not be implemented from memory —
     add it to the register via `btp-domain-expert` first, or raise it as an open question.
     If this spec touches no domain rule, write "No BTP rule applies." and justify it in one
     line — money, invoicing, TVA, retenue, situations and sous-traitance always touch one. -->

| Rule | Status in register | How it applies here | Blocking? |
|---|---|---|---|
| {R-001 e-invoicing} | {CONFIRMED · verified 2026-09-12} | {Invoice is a structured document with a lifecycle, not a PDF} | {No} |
| {R-002 retenue de garantie} | {TO VERIFY} | {5% withheld per situation} | {**Yes** — blocks CAP-3 until sourced} |

- **Status is copied from the register, never asserted here.** The register at
  `docs/domain/btp-rules.md` is the source of record; this table is a reference to it.
- **A rule that is not CONFIRMED blocks every capability that depends on it.** Name those
  capabilities in the "Blocking?" column and mirror each one as an `open_questions[]` entry.
  Downstream must not implement a `TO VERIFY` or `OPEN` rule — it gets sourced by
  `btp-domain-expert` first, and the register updated.
- **Ownership:** `btp-domain-expert` owns this section and wins over every other expert on a
  regulatory question, per CLAUDE.md.

## Assumptions

<!-- Optional. Omit this section entirely if empty. Inferred calls made without direct confirmation from the input. -->

- {Statement of fact the Spec proceeded under, e.g. "Assumed mobile-first since input mentioned GPS but no platform."}

## Open Questions

<!-- Optional. Omit this section entirely if empty. Gaps the input did not resolve that need a human decision before downstream skills consume the Spec. -->

- {Question phrased so a human can answer it, e.g. "Is offline playback in scope for CAP-2?"}
