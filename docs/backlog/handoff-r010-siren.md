# Handoff — R-010, client SIREN as a mandatory invoice mention

**From:** stream `main` (worktree `/Users/alexis/dev/btp-app`, claims `app,lib,components`)
**To:** stream `domain` (worktree `/Users/alexis/dev/btp-app-domain`, claims `docs/domain`)
**Date:** 2026-09-13

`docs/domain` is not this stream's to write, so the rule is handed over here instead of being
applied directly. **The `domain` session deletes this file once R-010 has landed in
`docs/domain/btp-rules.md`** — it is a transfer, not a document with a life of its own.

## Renumbered

This block was drafted as **R-009**. That number is now taken by *La mention valant
certification*, applied earlier today. It is renumbered **R-010** here. The only other place
the old number appears is `docs/specs/spec-e0-walking-skeleton/client-contact-fields.md`,
updated in the same change as this file.

## Provenance — read this before applying

The pages below were fetched and read by `btp-domain-expert` on **2026-09-13**; the reads are
logged in `.claude/agent-memory/btp-domain-expert/rules-verification-log.md` and the findings
in `docs/specs/spec-e0-walking-skeleton/.memlog.md`. That pass's **prose block was never
persisted** — only its sources and its conclusions. The entry below is reassembled from those
two records, so every claim traces to a logged read, but the wording is not the original
draft's. If you want belt-and-braces before marking it CONFIRMED in the register, re-fetch the
Légifrance articles; they are cited precisely enough to check in a couple of minutes.

## Block to add, after R-009 and before "## How to add a rule"

````markdown
## R-010 — Client SIREN as a mandatory invoice mention (B2B)

**Status:** CONFIRMED · verified 2026-09-13 — one sub-point open, see R-010.1
**Source:**
- legifrance.gouv.fr, **CGI annexe II art. 242 nonies A**, version en vigueur depuis
  2025-01-01
- legifrance.gouv.fr, **décret n° 2022-1299 du 7 octobre 2022**, art. 1 and art. 3
- legifrance.gouv.fr, **décret n° 2024-266 du 25 mars 2024**, art. 2
- legifrance.gouv.fr, **C. com. art. R. 123-221**
- legifrance.gouv.fr, **C. com. art. L441-9**, version en vigueur depuis 2019-04-26
- entreprendre.service-public.gouv.fr, fiche **F31808** — page states "vérifié le
  11 août 2026"

### The rule

- **CGI annexe II art. 242 nonies A, 1°** requires the invoice to carry « le nom complet, le
  numéro d'identification mentionné au premier alinéa de l'article R. 123-221 du code de
  commerce et l'adresse de l'assujetti **et de son client** ». The client's identification
  number is a mandatory mention, not an optional courtesy.
- **C. com. art. R. 123-221**: alinéa 1 is the **SIREN — nine digits**. Alinéa 2 is the SIRET
  (fourteen). The article the CGI points at is the first alinéa, so the mandatory mention is
  the **SIREN**. Do not narrow the field to a SIRET shape.
- **Entry into force.** The mention was inserted by décret n° 2022-1299 (art. 1); its
  application date in art. 3 was replaced by **décret n° 2024-266, art. 2**: invoices **issued
  from 1 September 2026**, and from **1 September 2027** for micro-entreprises and PME. The
  calendar is keyed to the **issuer's** size — the same axis as R-001, and inherited from it.
- **B2B only.** The obligation bears on the client's identification number as an `assujetti`.
  A `particulier` has none, so a B2C invoice carries no client SIREN. **Client type is
  load-bearing**: it decides whether the mention is required at all.
- **C. com. art. L441-9 does not carry this obligation** — it is silent on the buyer's SIREN.
  The requirement comes from the CGI annexe II, not the commercial code. Cite the right one.
- **Sanction:** CGI art. **1737, II** — a fine per omitted or inaccurate mention.

### R-010.1 — Does a missing buyer SIREN cause rejection by the annuaire?

**Status:** TO VERIFY · raised 2026-09-13
Separate question from the legal obligation: whether a structured invoice missing the buyer
SIREN is **rejected outright** at platform routing, or merely non-compliant. This changes
whether our validation blocks issuance or warns.

**What settles it:** the DGFiP **spécifications externes B2B v3.2 (30/04/2026)** on
impots.gouv.fr — not read at the time of writing.

### Implementation consequence

- Client SIREN stays **optional on the contact** (E0's decision, see
  `docs/specs/spec-e0-walking-skeleton/client-contact-fields.md`). The blocking validation
  belongs at **issuance**, not at contact save.
- It becomes **required to issue an invoice to a `professionnel` client** on our own issuing
  date under the R-001 calendar — 1 September 2027 for a TPE/PME issuer, which is what our
  pilot customer is. Wire the check to the issuer calendar, not to a hardcoded date.
- Store it as nine digits. Checksum validation (Luhn) is explicitly **out of E0 scope**; add it
  when the issuance gate is built, not before.
- Whether issuance is **blocked or warned** when the SIREN is missing depends on R-010.1.
  Until that resolves, warn loudly at issuance and record the gap — do not silently issue.

**Test table for `test-engineer`:** B2B invoice with a 9-digit client SIREN → valid; B2B
invoice with no client SIREN → flagged at issuance (blocking behaviour pending R-010.1); B2C
invoice with no client SIREN → valid, mention not required; client SIREN entered as a 14-digit
SIRET → normalised to the 9-digit SIREN or rejected, never stored as-is; issuer on the
2027-09-01 tranche invoicing before that date → mention not yet mandatory.
````
