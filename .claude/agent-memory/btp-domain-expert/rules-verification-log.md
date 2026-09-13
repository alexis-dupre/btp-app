---
name: rules-verification-log
description: Verification dates and official sources for each rule in docs/domain/btp-rules.md — which are sourced, which are stale, which need re-verification
metadata:
  type: project
---

Register of when each BTP rule was last verified against an official source, so entries older
than twelve months can be flagged. The rules themselves live in
`/Users/alexis/dev/btp-app/docs/domain/btp-rules.md` — that file is authoritative, this is the
verification calendar.

**Why:** rates and thresholds move (the fossil-fuel boiler exclusion landed 2025-03-01, the
attestation regime changed the same day). A rule with no verification date is a liability.

**How to apply:** before implementing any rule, check its date here. Anything older than
twelve months gets re-fetched from the official page before it enters code.

| Rule                          | Last verified | Status                                                                                       | Next trigger                          |
| ----------------------------- | ------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| R-001 e-invoicing             | 2026-09-12    | CONFIRMED                                                                                    | re-check calendar each release        |
| R-004 VAT on renovation       | 2026-09-13    | CONFIRMED (research done, entry not yet merged — see [[docs-domain-owned-by-domain-stream]]) | before 2027-01-01, CGI recodification |
| R-009 client SIREN on invoice | 2026-09-13    | CONFIRMED (research done, entry not yet merged — see [[docs-domain-owned-by-domain-stream]]) | before 2027-09-01 (PME issuing date)  |
| R-002, R-003, R-006, R-007    | never         | TO VERIFY                                                                                    | before any implementation             |
| R-008 retention               | n/a           | OPEN — needs the client's accountant                                                         | —                                     |

## R-004 sources actually read on 2026-09-13

- entreprendre.service-public.gouv.fr fiche **F23568** _Taux de TVA pour les travaux de
  rénovation d'un logement_ — page says vérifié 2026-02-21
- impots.gouv.fr _Quel taux de TVA appliquer pour les travaux réalisés dans les logements ?_
  (professionnel/questions) — last update 2026-03-05
- impots.gouv.fr _Plusieurs taux de TVA_ (particulier) — last update 2016-09-19 (stale page,
  used only for the 20 % standard rate)
- BOFiP **BOI-TVA-LIQ-30-20-90-10** (2014-09-19) — locaux concernés, mixed-use 50 % rule
- BOFiP **BOI-TVA-LIQ-30-20-90-40** (2025-10-22) — certification, retention, **liability §§220/230**
- BOFiP **BOI-TVA-LIQ-30-20-95** (2025-10-22) — 5,5 % énergétique, fossil-fuel boiler exclusion
- BOFiP **BOI-LETTRE-000280** (2025-10-22) — verbatim model mention
- Légifrance **CGI art. 279-0 bis**, version en vigueur depuis 2025-03-01
- entreprendre.service-public.gouv.fr actualité **A18088** (2025-03-03) — loi n° 2025-127 art. 41

## R-009 sources actually read on 2026-09-13

- Légifrance **CGI annexe II art. 242 nonies A**, version en vigueur depuis 2025-01-01 —
  1° now reads "Le nom complet, le numéro d'identification mentionné au premier alinéa de
  l'article R. 123-221 du code de commerce et l'adresse de l'assujetti **et de son client**"
- Légifrance **décret n° 2022-1299 du 7 octobre 2022**, art. 1 (inserts the mention) and art. 3
- Légifrance **décret n° 2024-266 du 25 mars 2024**, art. 2 — replaces art. 3 above: applies to
  invoices **émises à compter du 1er septembre 2026**, **1er septembre 2027** for micro/PME
- Légifrance **C. com. art. R. 123-221** — alinéa 1 = 9-digit SIREN; alinéa 2 = SIRET (14)
- Légifrance **C. com. art. L441-9**, version en vigueur depuis 2019-04-26 — no buyer SIREN
- entreprendre.service-public.gouv.fr fiche **F31808** — vérifié 2026-08-11
- impots.gouv.fr **spécifications externes B2B v3.2 (30/04/2026)** — not yet read (annuaire
  routing on buyer SIREN is still unverified)

## Two known time bombs

1. **CGI recodification.** The Légifrance page for art. 279-0 bis carries a notice that an
   **ordonnance du 17 décembre 2025** repeals it on **2027-01-01**, recodifying into the
   `code des impositions sur les biens et services`. Rates are not expected to change; the
   article references we print on invoices and store as `legal basis` will. Re-verify before
   January 2027.
2. **impots.gouv.fr cerfa pages 1300-SD / 1301-SD are stale** — they still present 2024
   versions with no abolition notice, even though the mention regime replaced them on
   2025-03-01. Do not treat those form pages as evidence the attestation still applies; the
   law (CGI art. 279-0 bis, 3) and BOFiP are authoritative.
