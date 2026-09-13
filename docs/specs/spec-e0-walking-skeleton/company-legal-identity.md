# Company legal identity — the mentions, and the rule that governs them

Scope: the legal mentions listed in `docs/product/devis-facture-direction.md` §4.7. Every
value below was read off the two real SoRenov devis in `docs/product/sources/`.

## The defect these fields must not reproduce

Both devis print the company's legal identity **twice** — a header block and a footer line —
and the two copies do not agree:

| | Header | Footer |
|---|---|---|
| Code NAF | `4331Z` | `4120B` |
| Company name | `SORENOV 75` | `SAS SO RENOV 75` |

`4331Z` is *travaux de plâtrerie*; `4120B` is *construction d'autres bâtiments*. One of them is
wrong on every document this company has sent. The competitor's settings explain how: §8.5 of
`costructor-devis-spec.md` lists *Pieds de page* as a setting separate from the company record,
so the footer is free text a human retyped, and it drifted.

**Requirement.** Each legal mention is entered once, stored once, in one structured field.
Every place the value appears — header, footer, a future PDF, a future Factur-X payload — reads
that single field. E0 provides no free-text block that restates a structured value, and the
settings form has exactly one input per mention. This is a correctness property of the data
model, not a preference about forms: two entry points for one legal identifier is how the
divergence above happened, and a wrong NAF code on an invoice is a real-world problem.

## The fields

Values in the second column are SoRenov's, observed on `DEVIS-I-26-07-24-CAHN.pdf` and
`DEVIS-I-26-09-1-AB-COFFEE-LAB.pdf`. They are the fixture E1 will render its header from.

| Field | Observed value | Required | Storage |
|---|---|---|---|
| Company name | `SO RENOV 75` | yes | text |
| Legal form | `SAS` | yes | text |
| Registered address (`siège social`) | `27 rue de la Bucaille, 95510 AINCOURT, FRANCE` | yes | structured: line 1, line 2, postal code, city, country |
| Contact email | `sorenov.75@outlook.com` | yes | text |
| SIRET | `98435066000010` | yes | text, 14 digits |
| N° TVA intracommunautaire | `FR94984350660` | yes | text |
| RCS | registry `Pontoise`, number `B 984 350 660` | yes | two fields — the city and the number are separate facts |
| Code NAF | `4331Z` **or** `4120B` — the company must choose | yes | text, 4 digits + 1 letter |
| Capital social | `1 200 €` | yes | `numeric(14,2)`. Money is never a string and never a float (`70-data-and-migrations.md`). Rendered `1 200 €`, stored `1200.00` |
| Décennale — insurer | `CBA Assurance` | yes | text |
| Décennale — contract number | `FR13-RCD24P01420` | yes | text |

Shape is validated with the shared Zod schema — digit counts and the `FR` prefix, read off the
observed values above. Checksum validation (the SIRET Luhn key, the TVA intracommunautaire key)
is **not** in E0; it is a future need, and a wrong-but-well-shaped SIRET is caught by a human
today.

## Not in E0

Document furniture, not legal mentions. Each is named so its absence is a decision:

| | Printed on the devis | Owner |
|---|---|---|
| Bank details — `Shine`, IBAN `FR76 1741 8000 0100 0118 3111 947`, BIC `SNNNFR22XXX` | yes, footer block | E3 |
| Payment terms (`30 % acompte, 70 % acompte`) | yes | E1 (per document) / E3 (defaults) |
| Client signature text (`Bon pour accord`) | yes | E3 |
| Devis validity period | yes (`Date de validité du devis`) | E1 |
| CGV reference line | yes | E3 |
| Logo, main colour, typography | logo absent from these two | E3 |
| Devis numbering configuration | n/a | E1 — and per §5 of the direction it must not share an implementation with facture numbering |

The boundary: §4.7 legal mentions are identity, and the direction scopes them to E0. Everything
above is how a document looks, and belongs with the document.

## Multiplicity

One row per organisation. The settings row is created with the organisation at signup, with
every mention empty, and is completed by the admin. E0 does not block signup on it — but an
organisation with an empty SIRET cannot produce a compliant document, which is E1's problem to
enforce, not E0's.
