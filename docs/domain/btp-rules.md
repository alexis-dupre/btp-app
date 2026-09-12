# BTP business rules — the register of record

**Rule of this file:** every entry has a source and a date. A rule without both is not usable
and must not be implemented. `btp-domain-expert` maintains this file; `test-engineer` turns
each rule into a test table.

Status values: `CONFIRMED` (source read, date recorded) · `TO VERIFY` (believed correct,
not yet sourced) · `OPEN` (needs a decision from the client or their accountant).

---

## R-001 — Electronic invoicing (réforme de la facturation électronique)

**Status:** CONFIRMED · verified 2026-09-12
**Source:** entreprendre.service-public.gouv.fr, DGFiP calendar

- Since **1 September 2026**, every VAT-registered business established in France must be
  able to **receive** electronic invoices through an approved platform
  (`plateforme agréée`, formerly PDP). Large companies and ETI must also **issue** them.
- **1 September 2027**: the issuing obligation extends to TPE, PME and micro-entreprises.
- Accepted structured formats: **Factur-X, UBL, CII**. Invoices transit through an approved
  platform; the public portal no longer carries the exchange itself.
- E-reporting of transaction data follows the same calendar.

**Implementation consequence:** the invoice module is built around a structured document
and a lifecycle (`issued → transmitted → received → accepted | rejected → paid`) from day
one, not a PDF with a status column. Choose the platform before writing the module (ADR).
Re-verify this calendar before each release — it has been postponed before.

---

## R-002 — Retenue de garantie

**Status:** TO VERIFY · needs a sourced read before implementation
**Believed:** capped at 5% of the contract amount, withheld on each payment, released one
year after acceptance if no reserve remains, and replaceable by a bank guarantee at the
contractor's choice. Basis: loi n° 71-584 du 16 juillet 1971.

**Before implementing:** confirm the cap, the release trigger, the one-year clock's start
point, and the treatment when reserves are still open. Then write the test table:
retention on a partial situation, release with and without reserves, substitution by a
guarantee mid-contract.

---

## R-003 — Autoliquidation de la TVA in subcontracting

**Status:** TO VERIFY
**Believed:** for construction works carried out by a subcontractor for a VAT-registered
main contractor, VAT is reverse-charged: the subcontractor invoices without VAT and states
the reverse-charge mention; the main contractor declares the VAT. Basis: CGI art. 283-2 nonies.

**Before implementing:** confirm the exact scope (which works, which relationships), the
mandatory wording on the invoice, and the interaction with `situations`.

---

## R-004 — VAT rates on renovation work

**Status:** TO VERIFY · rates change; never hardcode from memory
**Believed:** a standard rate, a reduced rate for improvement and maintenance work on
dwellings completed more than two years ago, and a further reduced rate for certain energy
renovation work — each conditioned on a client attestation kept by the contractor.

**Before implementing:** get the current rates and conditions from impots.gouv.fr, and model
the attestation as a required document blocking the reduced rate. Store the rate **on the
invoice line**, as applied, never as a lookup at render time.

---

## R-005 — Situations de travaux are cumulative

**Status:** CONFIRMED by domain practice · source: contractual practice, to be confirmed
against the client's own contracts

A `situation` states the **cumulative** percentage completed per ouvrage since the start of
the marché. The amount due for the period is `cumulative amount − previously invoiced`.
This is the single most common source of billing bugs.

Test table must cover: first situation; a situation after an `avenant`; a situation whose
cumulative percentage decreases (correction); the final situation reaching 100%; interaction
with retention and with the `compte prorata`.

---

## R-006 — Subcontracting declaration

**Status:** TO VERIFY
**Believed:** a subcontractor must be declared to and accepted by the client, with payment
terms approved; on public contracts, direct payment applies above a threshold. Basis: loi
n° 75-1334 du 31 décembre 1975.

**Before implementing:** confirm thresholds, the public/private difference, and what the
product must block when a subcontractor is not declared.

---

## R-007 — Handover and warranties

**Status:** TO VERIFY
**Believed:** acceptance (`réception`) starts the warranty clocks — a one-year
`parfait achèvement`, a two-year `bon fonctionnement`, and the ten-year `décennale` under
Code civil art. 1792. Reserves listed at acceptance must be cleared within an agreed period.

**Before implementing:** confirm the clocks and what the product must evidence and archive.

---

## R-008 — Document retention

**Status:** OPEN · decide with the client's accountant

Accounting documents have a legal retention period; construction files linked to décennale
liability are kept far longer. The archive strategy (what, where, for how long, in what
format, how it is produced on request) must be decided **before** the document module is
built, because it drives storage, immutability and export.

---

## How to add a rule

Copy the block shape above. No rule enters the code before its status is `CONFIRMED`.
When in doubt, the answer is "ask the client's accountant", not "implement our best guess".
