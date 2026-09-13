---
id: SPEC-e0-walking-skeleton
companions:
  - client-contact-fields.md
  - company-legal-identity.md
sources:
  - docs/product/devis-facture-direction.md
  - docs/product/sources/costructor-devis-spec.md
  - docs/product/sources/DEVIS-I-26-07-24-CAHN.pdf
  - docs/product/sources/DEVIS-I-26-09-1-AB-COFFEE-LAB.pdf
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Epic E0 — Walking skeleton

## Why

Every epic after this one writes money into a database on behalf of a company that is not the
only company using the product. A devis line, a situation, a facture: each is worthless if the
boundary between organisations is not already proven, and each is expensive to retrofit onto a
boundary that was assumed rather than built. E0 exists to make that boundary real and to prove
it with a test before there is anything valuable behind it.

It carries two payloads that E1 needs on day one and that nothing else will provide: the
company's own legal identity — the block printed on every devis SoRenov sends — and a client
to address a devis to. Both were read off two real documents, not imagined.

This is the epic the direction marks as built with a human in the loop for its first two
stories. Nothing here is autonomous work.

## Capabilities

- **CAP-1**
  - **intent:** A visitor signs up and becomes the admin of a newly created organisation.
  - **success:** One form submission creates exactly one organisation, one user and one empty company-settings row, in a single transaction; a failure at any point leaves no orphan of any of the three. The new user's session carries that organisation and no other.

- **CAP-2**
  - **intent:** A user signs in and out, and an administrator can end a session from the server.
  - **success:** A valid credential pair yields an httpOnly, Secure, SameSite=Lax session cookie with a short TTL. Sign-out revokes the session server-side, and a request replaying the revoked cookie is rejected. An unknown email and a wrong password are indistinguishable to the caller — same response, same shape, same timing class.

- **CAP-7**
  - **intent:** A user who has forgotten their password regains access to their account without an administrator.
  - **success:** A reset request yields the same response whether or not the email exists. A single-use, high-entropy, short-lived token arrives by email; consuming it sets a new password, invalidates the token, and revokes every existing session for that user. A replayed, expired or tampered token fails closed. Requesting a reset is rate-limited per email and per IP.

- **CAP-3**
  - **intent:** Every read and write of tenant-scoped data is scoped by the caller's organisation, and it is impossible to write code that forgets to do so.
  - **success:** No query function in `lib/db/` can be called without an organisation scope derived from the session — omitting it is a TypeScript compile error, demonstrated by a type-level test. Row Level Security is enabled on every tenant-scoped table as the second line. The negative test named below passes.

- **CAP-4**
  - **intent:** An admin records the company's legal mentions once, and every future rendering reads them from that single record.
  - **success:** The eleven fields of `company-legal-identity.md` are stored as structured columns, one input each, and SoRenov's real values round-trip through the form unchanged. No free-text field in E0 restates a structured value. Capital is stored as a number and rendered with a space thousands separator and the euro sign.

- **CAP-5**
  - **intent:** An admin creates and edits a client contact, either a `particulier` or a `professionnel`.
  - **success:** The field set and the required-optional-future verdicts of `client-contact-fields.md` are implemented exactly. `Stéphanie CAHN` and `AB COFFEE LAB` can both be created with only the data their devis prints, and the derived display line matches the document. The type toggle changes which name fields are required, and switching type does not silently discard data already entered.

- **CAP-6**
  - **intent:** An admin finds a client among the organisation's contacts.
  - **success:** The list is cursor-paginated with a hard limit, ordered deterministically, and never issues a query per row. It renders an empty state, a loading state and an error state. A contact belonging to another organisation is not reachable from it by any means, including a guessed identifier.

## Constraints

- **Tenancy is a type, not a convention.** `lib/db/` is the only place SQL exists, and its query functions require an organisation scope object derived from the session. Making the omission a compile error is the deliverable; a code review habit is not.
- **The organisation comes from the session, always.** Never from a path segment, a query parameter, a header or a form field. Any request body containing an organisation identifier is rejected, not ignored. The single exception is the password-reset token exchange, which has no session by definition — it is named in the authorisation table and derives the organisation from the token's user *after* verifying the token, never from caller input.
- **Unknown or foreign identifiers return 404, never 403.** A 403 tells the caller the row exists in someone else's organisation.
- **Shared schema with `org_id` plus Row Level Security**, the documented default of `10-architecture.md`. That standard lists the multi-tenancy model as a decision owed before the first line of feature code; E0 is that first line, so E0 records the ADR.
- **One legal mention, one field, one rendering.** Both source devis print the company's Code NAF twice and disagree with themselves — `4331Z` in the header, `4120B` in the footer. E0 stores each mention once and forbids a free-text block that restates it. See `company-legal-identity.md`.
- **Collect nothing that nothing uses.** A field enters E0 only if E0, E1 or the sending of a document consumes it. Everything the competitor collects and we do not is recorded as a named future need in `client-contact-fields.md`, never quietly dropped.
- **Personal data stays retrofittable.** Every record holding personal data carries a creation timestamp, and every data subject has a stable identifier that does not change when their details are edited. These two cost nothing now and are what make a subject-access export, a deletion with retention override and a read audit trail addable later without a backfill that cannot be reconstructed.
- **Money is `numeric(14,2)`.** Capital social is money. It is rendered `1 200 €` and stored `1200.00`.
- **Identifiers are UUID v7, generated client-side at creation time**, per ADR-0006. Every mutation goes through one layer, and no business logic lives in a component — the two other constraints that keep offline support addable later.
- **The full six-role enum of `30-security.md` ships in the schema**, but only `admin` is assignable and tested in E0. This buys the later roles without an enum migration and without pretending they are enforced.
- **MFA is deferred under its own ADR**, which fixes the deadline. E0 ships password authentication, a server-revocable session, and a rate limit on sign-in, sign-up and password reset. The schema reserves the column now.
- **100% shadcn registry components and preset tokens.** `components/ui/**` is regenerated, never hand-edited. The token source of truth is `app/globals.css`, per ADR-0001.

## Non-goals

E0 is the walking skeleton. Everything below is a deliberate exclusion, not an oversight.

- **No devis, no chantier, no facture, no PDF, no line items.** The site address stays a plain text line on a future devis; there is no `chantier` entity.
- **No margin engine**, in any form — the direction cuts it wholesale.
- **No second user in an organisation.** No invitations, no user management screen, no role assignment UI. One admin per organisation is the whole of E0.
- **No authorisation enforcement beyond `admin`.** The other five roles exist in the enum and nothing grants them.
- **No MFA**, deferred under an ADR that fixes its deadline.
- **No RGPD subject-access export, no deletion flow, no read audit trail.** `30-security.md` §8 asks for all three "from the start" and E0 creates the product's first personal data, so the deferral is an ADR with an observable trigger — before the second paying organisation is onboarded, or on the first user request, whichever comes first — not a milestone that can slip quietly. E0 ships the creation timestamp and the stable subject identifier that make the retrofit possible.
- **No organisation switching.** A user belongs to exactly one organisation.
- **None of the competitor's accounting or CRM fields** on a contact: `compte auxiliaire`, `taux de TVA par défaut`, `délai de paiement par défaut`, `interlocuteurs`, notes, `responsable`, prospect status, repeated addresses, emails or phones.
- **No document furniture in company settings**: bank details, payment terms, CGV, signature text, logo, colours, typography, devis numbering. Those belong to E1 and E3 and are listed in `company-legal-identity.md`.
- **No SIRET or VAT checksum validation.** Shape only.
- **No offline support**, per ADR-0006.
- **No e-invoicing platform choice.** E0 only avoids foreclosing it by storing identity as structured fields.

## Success signal

Two organisations exist in one database. Organisation A's admin, holding a valid session and
the identifier of organisation B's client contact, receives a 404 — and the test that proves it
is in CI, failing the build if anyone breaks it. That is the boundary the rest of the product
is built on, demonstrated rather than asserted.

Alongside it: SoRenov's own legal block — SIRET `98435066000010`, TVA `FR94984350660`, RCS
`Pontoise B 984 350 660`, capital `1 200 €`, décennale `CBA Assurance` contract
`FR13-RCD24P01420` — is stored once, and `Stéphanie CAHN` and `AB COFFEE LAB` exist as contacts
of the right type. E1 can then render the header of `I-26-07-24` from stored data instead of a
fixture, which is the moment E0 has paid for itself.

## Tenant isolation impact

- **New or altered persisted data:**
  - `organisation` — the tenant itself. No `org_id` column: its primary key *is* the tenant key. This is the only table in the epic without one.
  - `user_account` — `org_id uuid NOT NULL` FK, plus a creation timestamp and a stable subject identifier, per the personal-data constraint. Email is unique per organisation, not globally, so two companies can each have their own `contact@` address.
  - `session` — `user_id` FK and `org_id uuid NOT NULL`. The scope is read from this row, never recomputed from client input.
  - `password_reset_token` — `user_id` FK and `org_id uuid NOT NULL`. Stores a hash of the token, never the token; single-use, short-lived, with a consumed-at timestamp.
  - `company_settings` — `org_id uuid NOT NULL` FK, `UNIQUE`. One row per organisation, created empty at signup.
  - `client_contact` — `org_id uuid NOT NULL` FK, a creation timestamp and a stable subject identifier, with a composite index leading on `org_id` per rule 4 of `40-performance-scalability.md`.
  - Row Level Security is enabled on all five tenant-scoped tables, with a policy keyed on the session's organisation. It is the second line, not the first — the typed scope is the first.
- **Read paths:** `getCompanySettings`, `getClientContact`, `listClientContacts`. All three take the organisation from the session cookie via the scope object. `getClientContact` filters on `org_id` *and* `id` in the same `WHERE`, so a foreign identifier returns no row and the handler returns 404 — it never fetches by id and then compares.
- **Write paths:** `signUp` creates the organisation and stamps the new user with it. `updateCompanySettings`, `createClientContact` and `updateClientContact` stamp `org_id` from the scope object on insert, and the Zod schemas at the boundary have no organisation field at all — a caller cannot supply one, so there is nothing to forget to strip. Updates carry `org_id` in the `WHERE`, not only in the read that preceded them.
- **Cross-tenant surfaces:** one, and it is the password-reset token exchange. It runs without a session, so it cannot derive the organisation from one: it looks the token up by hash across all organisations, and only after the token verifies does it adopt that token's user and organisation. It reads and writes nothing tenant-scoped beyond that user's own password and sessions. Its authorisation predicate is in the table below, and the isolation test asserts that a valid token for organisation B, presented while holding a session for organisation A, changes nothing in organisation A.
- **Negative test named here:** `lib/db/tenant-isolation.test.ts` — seeds two organisations, each with a company-settings row and a client contact, then asserts for every tenant-scoped read and write that organisation A using organisation B's identifier gets 404 and no row changes. It runs against real Postgres under `test:integration`; a mocked ORM proves nothing. A second case runs the same assertions with RLS as the only defence, to prove the second line works on its own.

## Authorisation

Only `admin` is assignable in E0, so every authenticated operation below names it. The other
five roles exist in the enum and grant nothing.

| Operation | Actor(s) allowed | Authorisation predicate | On denial |
|---|---|---|---|
| `signUp` | unauthenticated | `rateLimit.ok(ip) && !emailTakenWithinNewOrg` — creates organisation, user and settings row in one transaction | 429 when rate-limited; a generic 400 otherwise, never revealing whether an email exists |
| `signIn` | unauthenticated | `rateLimit.ok(ip, email) && user.active && verifyPassword(input, user.hash)` | 401 with one message for both unknown email and wrong password; 429 when rate-limited |
| `signOut` | any authenticated session | `session.valid` — revokes the session row server-side | 204 regardless, so it is never a probe |
| `requestPasswordReset` | unauthenticated | `rateLimit.ok(ip, email)` — always returns the same response, whether or not the address resolves to a user | 429 when rate-limited; otherwise indistinguishable from success |
| `resetPassword` | unauthenticated, bearer of a valid token | `token.matchesHash && !token.consumed && token.expiresAt > now` — the organisation is adopted from `token.user.orgId` after verification, never from caller input; consuming the token revokes every session of that user | 400 with one message for expired, consumed, unknown and malformed tokens alike |
| `getCompanySettings` | `admin` | `session.valid && session.role == 'admin' && settings.orgId == session.orgId` — the row is selected by `session.orgId`, never by an identifier from the request | 404 |
| `updateCompanySettings` | `admin` | `session.valid && session.role == 'admin' && settings.orgId == session.orgId` | 404 |
| `createClientContact` | `admin` | `session.valid && session.role == 'admin'` — `org_id` is stamped from the session scope; the input schema has no organisation field | 404 on a bad session, 400 on schema failure |
| `updateClientContact` | `admin` | `session.valid && session.role == 'admin' && contact.orgId == session.orgId` | 404 |
| `getClientContact` | `admin` | `session.valid && session.role == 'admin' && contact.orgId == session.orgId` | 404 |
| `listClientContacts` | `admin` | `session.valid && session.role == 'admin'` — scope from the session, cursor validated as belonging to the same organisation | 404 |

- **Default:** anything not listed above is denied. `signUp`, `signIn`, `requestPasswordReset` and `resetPassword` are the only intentionally unauthenticated operations; all four are rate-limited because they are the product's entire attack surface at E0.
- **Ownership:** `security-architect` owns this section. Disagreement about a predicate is resolved by `security-architect`, per CLAUDE.md.

## Performance budget

| Surface | Realistic volume | p95 budget | Query budget | Payload budget |
|---|---|---|---|---|
| Client contact list | 500 contacts per organisation, 50 per page | < 300 ms server | ≤ 2 queries, no N+1 | ≤ 180 KB gzip first-load JS |
| Client contact form | 1 row | < 300 ms server | ≤ 2 queries | ≤ 180 KB gzip first-load JS |
| Company settings form | 1 row, 11 fields | < 300 ms server | 1 query | ≤ 180 KB gzip first-load JS |
| Sign-up / sign-in / password reset | n/a | < 300 ms server **excluding the password KDF** | ≤ 3 queries | ≤ 180 KB gzip first-load JS |

- **Volume basis:** the pilot is a renovation business accumulating a few hundred clients over the life of the company, not thousands. 500 is that figure, not a measured one — it comes from a single customer and is an assumption to revisit on the second. `40-performance-scalability.md` sizes chantiers, pointages and devis lines, and says nothing about contacts. The number matters less than the shape it forces: the list is cursor-paginated from the first commit, so a wrong estimate costs a budget revision and not a rewrite.
- **Degradation:** at ten times the estimate the list stays correct because it is cursor-paginated with a hard limit and never loads a full set into the client. Search, when it arrives, is server-side with an index; client-side filtering of a fetched list is forbidden at any volume.
- **On-site conditions:** E0's surfaces are desk work — the direction's §1 has the owner writing at his desk or in the car — so none of them is a gloved, one-handed, sunlit interaction. Sign-in and password reset are the exceptions and can happen anywhere. All surfaces must render usable content on a throttled Fast 3G profile, tested rather than assumed. There is no offline behaviour: per ADR-0006 a failed mutation surfaces an error and is retried by the user, and the three constraints that keep offline addable later are listed above.
- **Password KDF:** the hash is deliberately slow and must not be tuned down to fit a latency budget. Its cost is excluded from the 300 ms server budget and stated explicitly in the ADR that chooses the algorithm and its parameters.

## BTP rules applicability

| Rule | Status in register | How it applies here | Blocking? |
|---|---|---|---|
| R-001 electronic invoicing | CONFIRMED · verified 2026-09-12 | The company's legal mentions and the client's identification are exactly what a structured invoice carries. E0 stores both as structured columns rather than free text, and collects the client's SIREN/SIRET optionally, so E4 extends a model instead of rewriting one. Nothing in E0 issues or transmits a document. | No |
| R-004 VAT rates on renovation work | TO VERIFY · rates change; never hardcode from memory | The reason E0 does not collect the competitor's per-client `taux de TVA par défaut` (§5.1, tab *Comptabilité*). No VAT rate is stored anywhere in E0. | No — because E0 stores no rate. It blocks that field until the register is sourced. |
| R-008 document retention | OPEN · decide with the client's accountant | Governs how long a client contact and its personal data may be kept, and what a deletion request is actually allowed to delete. E0 stores personal data with no retention answer on file. | Yes for any deletion or RGPD retention capability — which is why none is in E0 and why its deferral ADR carries an observable trigger. |

R-002 (retenue de garantie), R-003 (autoliquidation), R-005 (situations cumulatives), R-006
(déclaration de sous-traitance) and R-007 (réception et garanties) do not apply: E0 has no
devis, no situation, no facture, no subcontractor and no acceptance.

**A candidate rule is drafted and awaiting the register.** `btp-domain-expert` has sourced the
client-identification question against Légifrance and service-public, and produced a block for
`docs/domain/btp-rules.md` as R-009. That file is owned by another live stream, so the entry is
handed over rather than written from here, and **this spec cites no status for it until it
lands** — a regulatory rule is settled in the register or it is not settled at all.

Two of its findings change E0's reading of the field once it is registered, so they are named
here rather than discovered during E1: the mandatory mention is the **SIREN** (nine digits,
C. com. art. R. 123-221 alinéa 1), not the SIRET, and **client type is load-bearing** — the set
of mentions a future invoice must carry is a function of `particulier` versus `professionnel`,
which is one more reason that toggle is not a cosmetic label. Nothing in E0 changes on either
count: the field stays optional on the contact, which is what the drafted rule itself
prescribes, and the blocking validation belongs to invoice issuance in E4.

- **Status is copied from the register, never asserted here.** The register at `docs/domain/btp-rules.md` is the source of record; this table is a reference to it.
- **Ownership:** `btp-domain-expert` owns this section and wins over every other expert on a regulatory question, per CLAUDE.md.

## Assumptions

- Signup model, role scope, MFA deferral, password reset in scope, and the shape of the RGPD deferral were all decided by Alexis on 2026-09-13, in session.
- A user belongs to exactly one organisation. Multi-organisation membership would change the session shape and the scope object, so it is named here rather than discovered later.
- Email is the login identifier, and the product can send email — password reset depends on it, and no transactional email provider is chosen yet.
- The interface is in French. The users are French construction professionals and every source document is French.
- The eleven company fields and their shapes are read off the two SoRenov devis; the company's own registry extract was not consulted.
- 500 client contacts per organisation comes from one pilot's description of its own business, not from measurement.
