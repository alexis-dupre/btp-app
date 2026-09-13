# BTP business rules — the register of record

**Rule of this file:** every entry has a source and a date. A rule without both is not usable
and must not be implemented. `btp-domain-expert` maintains this file; `test-engineer` turns
each rule into a test table.

Status values: `CONFIRMED` (source read, date recorded) · `TO VERIFY` (believed correct,
not yet sourced) · `OPEN` (needs a decision from the client or their accountant).

**A status marker is exactly one of those three words and nothing else**, optionally followed
by one suffix — ` · verified YYYY-MM-DD` or ` · raised YYYY-MM-DD` — and nothing further.
Every `CONFIRMED` must carry its ` · verified YYYY-MM-DD` date.

No qualifiers and no hedges: not `CONFIRMED by domain practice`, not
`CONFIRMED … except …`. A qualified `CONFIRMED` is read as `CONFIRMED` by anyone skimming,
which is exactly what a three-value vocabulary exists to prevent. When a rule is confirmed
apart from one open point, that point becomes its own sub-rule `R-nnn.n` carrying its own
`TO VERIFY` marker, and the parent rule reads plain `CONFIRMED`.

`scripts/check-rules.mjs` enforces this, and the gate runs it. It is not a style preference.

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

**Status:** TO VERIFY
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

## R-004 — VAT rates on renovation work in dwellings

**Status:** CONFIRMED · verified 2026-09-13
**Source:**

- entreprendre.service-public.gouv.fr, _Taux de TVA pour les travaux de rénovation d'un
  logement_ (fiche F23568) — page states "vérifié le 21 février 2026"
- impots.gouv.fr, _Quel taux de TVA appliquer pour les travaux réalisés dans les logements ?_
  (professionnel / questions) — page states last update 5 March 2026
- impots.gouv.fr, _Plusieurs taux de TVA_ (particulier) — last update 19 September 2016
- bofip.impots.gouv.fr, **BOI-TVA-LIQ-30-20-90-10** — _Locaux concernés_ (19 September 2014)
- bofip.impots.gouv.fr, **BOI-TVA-LIQ-30-20-90-40** — _Modalités d'application_ (22 October 2025)
- bofip.impots.gouv.fr, **BOI-TVA-LIQ-30-20-95** — _Travaux d'amélioration de la qualité
  énergétique_ (22 October 2025)
- legifrance.gouv.fr, **CGI art. 279-0 bis** — "version en vigueur depuis le 01/03/2025"
- entreprendre.service-public.gouv.fr, actualité **A18088** (3 March 2025) — basis
  loi n° 2025-127 du 14 février 2025 de finances pour 2025, art. 41

The client certification that conditions every reduced rate below is **R-009**. Two points
this entry does not settle are carried as **R-004.1** and **R-004.2** at the end of the entry;
everything above them is sourced and usable now.

### The rates

| Rate      | Legal basis          | Applies to                                                                                                                                                                                           |
| --------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **20 %**  | CGI art. 278         | Standard rate. The default. Everything that does not meet a reduced-rate condition below.                                                                                                            |
| **10 %**  | CGI art. 279-0 bis   | `Travaux d'amélioration, de transformation, d'aménagement et d'entretien` — other than energy renovation — on `locaux à usage d'habitation achevés depuis plus de deux ans`.                         |
| **5,5 %** | CGI art. 278-0 bis A | `Travaux de rénovation énergétique` on the same premises, plus the `travaux induits` indissociably linked to them.                                                                                   |
| **2,1 %** | (per fiche F23568)   | Guadeloupe, Martinique, La Réunion, for the same eligible work. Corsica: 5,5 % on energy work (BOI-TVA-LIQ-30-20-95). Out of scope for the pilot; recorded so nobody hardcodes "France = 20/10/5,5". |

### Conditions common to 10 % and 5,5 %

1. **The premises are a dwelling** (`local à usage d'habitation`): house, apartment in a
   collective building, `logement de fonction`, collective housing establishment, and the
   dependencies (garage, cave, terrasse). Mixed-use premises: if habitation is **≥ 50 %** of
   the premises, the reduced rate applies to the whole works; below 50 %, only to work on the
   exclusively residential areas. (BOI-TVA-LIQ-30-20-90-10)
2. **The building was completed more than two years** before the works start. Completion is
   `achèvement` in the sense of CGI art. 257; the condition is assessed at the **start date of
   the works**. (BOI-TVA-LIQ-30-20-90-10)
3. **Who the client is does not matter**, as long as they are the `preneur`: owner, `syndicat
de copropriétaires`, tenant, occupant `à titre gratuit`, or their representative — main or
   secondary residence. (CGI art. 279-0 bis, 3 ; impots.gouv.fr)
4. **The client certifies** the conditions on the devis or the facture — see **R-009**.
   Without it the reduced rate is not available to the contractor.

### Explicitly excluded — these fall back to 20 %

- **Non-dwelling premises**: `locaux affectés à une activité professionnelle, commerciale,
industrielle ou administrative`, hotels and commercial accommodation, offices, clinics and
  hospitals, laboratories, workshops. (BOI-TVA-LIQ-30-20-90-10)
- **Buildings completed less than two years** ago.
- Work which, over a period of **no more than two years**, (a) `concourt à la production d'un
immeuble neuf` within CGI art. 257, or (b) increases the `surface de plancher` of the
  existing premises by **more than 10 %**. (CGI art. 279-0 bis, 2)
- `Nettoyage`, and `aménagement / entretien des espaces verts`.
- The **fourniture d'appareils ménagers ou de mobilier**.
- The **acquisition de gros équipements** supplied as part of installation or replacement of
  heating, lifts, sanitary installations or air-conditioning — list fixed by arrêté
  (CGI annexe IV, art. 30-00 A). The **equipment portion** is at 20 %; the installation labour
  stays at the reduced rate. (CGI art. 279-0 bis, 1)
- **Since 1 March 2025**: the supply and/or installation of `chaudières susceptibles d'utiliser
des combustibles fossiles` (gas, fuel oil, hybrid heat pumps with fossil back-up) is at
  **20 %**. Maintenance and repair of an existing high-performance boiler keeps the reduced
  rate, unless it amounts to installing a new one. (impots.gouv.fr ; BOI-TVA-LIQ-30-20-95)
  This exclusion is recent and its perimeter is still moving — recheck BOI-TVA-LIQ-30-20-95
  before each release.
- Equipment **bought directly by the client**: only the contractor's installation service can
  carry the reduced rate. (fiche F23568)

### Worked cross-check — the pilot customer's two devis

**Devis A — 10 % on an apartment renovation in Paris. Confirmed, conditionally.**
The rule that drives it is the pair _dwelling_ + _building completed more than two years ago_
(CGI art. 279-0 bis, 1). An apartment is a `local à usage d'habitation`; a Parisian apartment
building is essentially always `achevé depuis plus de deux ans`, but the age is a fact to be
recorded per chantier, not assumed. Building age is what separates 10 % from 20 % here.
It is correct **only if** all of: the works are `amélioration / transformation / aménagement /
entretien`; they do not produce an `immeuble neuf` nor add more than 10 % `surface de
plancher` over ≤ 2 years; the client's mention is on the devis. Three ways this devis is
wrong at 10 % on some lines: any **energy renovation** line belongs at **5,5 %**, not 10 %
(nature of works, art. 278-0 bis A); any **fossil-fuel boiler** supplied or installed is at
**20 %** since 1 March 2025; any **gros équipement** from the annexe IV list is at 20 % for
the equipment, 10 % for the labour. So: one devis, potentially three rates, per line.

**Devis B — 20 % on a commercial coffee-shop fit-out. Confirmed.**
The rule that drives it is the **nature of the premises**, not the building age and not the
nature of the works. A coffee shop is a `local affecté à une activité commerciale`, expressly
outside the scope of CGI art. 279-0 bis and art. 278-0 bis A (BOI-TVA-LIQ-30-20-90-10). Even
in a 19th-century building, even for pure `entretien`, even with a client mention on the devis,
the rate is 20 %. The only nuance: if the same devis covered an attached dwelling, or premises
that are ≥ 50 % habitation, the mixed-use rule would reopen the reduced rate for that part.

### Implementation consequence

- **Store the applied rate on the invoice/devis line, as applied** — decimal, not a lookup at
  render time. This still holds and is now load-bearing: a single document legitimately mixes
  5,5 / 10 / 20 (energy work, fossil boiler, gros équipement, non-dwelling part). Rate is a
  **line-level** field, never a document-level one. Store alongside it the **legal basis**
  (`art. 279-0 bis`, `art. 278-0 bis A`, `art. 278`) so an audit can be answered from the row.
- **The chantier/local entity must carry** `usage` (habitation / mixte / non-habitation),
  `pourcentage habitation`, and `date d'achèvement`. Eligibility is decided from these, and
  they must be captured **before** pricing, not at invoicing.
- **Rounding:** VAT is computed per line on the line's HT amount in integer cents, then summed
  per rate into a `ventilation TVA` block; never compute VAT on the document total across mixed
  rates. Half-up at the cent, per line.
- **Factur-X / e-invoicing (R-001)**: rates go per line in the structured document.

**Test table for `test-engineer`** (rate expected, per line):

| #   | Premises                            | Achèvement    | Nature of works                                      | Certification        | Expected                                                        |
| --- | ----------------------------------- | ------------- | ---------------------------------------------------- | -------------------- | --------------------------------------------------------------- |
| 1   | Apartment, habitation               | > 2 years     | Repainting, new kitchen fit (no gros équipement)     | mention 279-0 bis    | 10 %                                                            |
| 2   | Apartment, habitation               | > 2 years     | Loft insulation                                      | mention 278-0 bis A  | 5,5 %                                                           |
| 3   | Apartment, habitation               | > 2 years     | Loft insulation + induced replastering               | mention 278-0 bis A  | 5,5 % on both                                                   |
| 4   | Apartment, habitation               | > 2 years     | Supply + install gas boiler                          | mention 278-0 bis A  | 20 %                                                            |
| 5   | Apartment, habitation               | > 2 years     | Maintenance of existing high-performance boiler      | mention 278-0 bis A  | 5,5 %                                                           |
| 6   | House, habitation                   | > 2 years     | Lift installation: equipment line / labour line      | mention 279-0 bis    | 20 % / 10 %                                                     |
| 7   | House, habitation                   | **18 months** | Improvement work                                     | mention present      | 20 %                                                            |
| 8   | Apartment, habitation               | > 2 years     | Extension adding 12 % surface de plancher            | mention present      | 20 %                                                            |
| 9   | Apartment, habitation               | > 2 years     | Extension adding 8 % surface de plancher             | mention 279-0 bis    | 10 %                                                            |
| 10  | **Coffee shop**, commercial         | > 2 years     | Full fit-out                                         | mention present      | 20 % — premises excluded, certification irrelevant              |
| 11  | Mixed premises, **60 %** habitation | > 2 years     | Improvement, whole premises                          | mention 279-0 bis    | 10 % on the whole                                               |
| 12  | Mixed premises, **30 %** habitation | > 2 years     | Improvement, whole premises                          | mention 279-0 bis    | 10 % on the exclusively residential part only, 20 % on the rest |
| 13  | Apartment, habitation               | > 2 years     | Improvement                                          | **no certification** | reduced rate refused at validation; 20 % or blocked document    |
| 14  | Apartment, habitation               | > 2 years     | Garden maintenance                                   | mention 279-0 bis    | 20 % — excluded works                                           |
| 15  | Apartment, habitation               | > 2 years     | Improvement, 850 € TTC                               | simplified mention   | 10 %                                                            |
| 16  | Apartment, habitation               | > 2 years     | Client-purchased equipment, contractor installs only | mention 279-0 bis    | 10 % on the labour; equipment not on our invoice                |

### R-004.1 — Retention clock: does it start at achèvement or at facturation?

**Status:** TO VERIFY · raised 2026-09-13
Both sources agree the period is **five years**, and disagree on where it starts. CGI art.
279-0 bis, 3 and the A18088 actualité tie it to `achèvement des travaux` for improvement and
maintenance work; BOI-TVA-LIQ-30-20-90-40 § 100 words it « jusqu'au 31 décembre de la
cinquième année suivant leur **facturation** ».

**Interim rule, safe under both:** retain until `31 December of year(max(achèvement,
facturation)) + 5`. Implement this now; it is never shorter than either reading.

**What settles it:** BOI-TVA-LIQ-30-20-90-40 § 100 read in full against the current Légifrance
text of CGI art. 279-0 bis, 3. Feeds **R-008** and **R-009.1**.

### R-004.2 — CGI recodification on 1 January 2027

**Status:** TO VERIFY · raised 2026-09-13
The Légifrance page for CGI art. 279-0 bis carries a notice that an **ordonnance du
17 décembre 2025** repeals these provisions on **1 January 2027**, recodifying them into the
`code des impositions sur les biens et services`.

The **rates are not expected to move**; the **article references we store on invoice lines and
print on documents will**. This is why the legal basis is stored as data per line rather than
rendered from a constant.

**What settles it:** the Légifrance consolidated text of that ordonnance, giving the successor
articles. Must be resolved **before January 2027**.

---

## R-005 — Situations de travaux are cumulative

**Status:** TO VERIFY · raised 2026-09-13
**Believed:** cumulative situation billing is established domain practice and is how the
trade actually bills, but it is not yet sourced against the client's own marché documents.

A `situation` states the **cumulative** percentage completed per ouvrage since the start of
the marché. The amount due for the period is `cumulative amount − previously invoiced`.
This is the single most common source of billing bugs.

**Before implementing:** confirm the cumulative convention, the deduction base and the
rounding against the client's actual marché and CCAP, and record the date here. No
computation is implemented from this rule while it is `TO VERIFY`.

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

**Status:** OPEN

**To decide, with the client's accountant:** this rule is open until they answer.

Accounting documents have a legal retention period; construction files linked to décennale
liability are kept far longer. The archive strategy (what, where, for how long, in what
format, how it is produced on request) must be decided **before** the document module is
built, because it drives storage, immutability and export.

---

## R-009 — La mention valant certification (client certification for reduced-rate work)

**Status:** CONFIRMED · verified 2026-09-13
**Source:**

- bofip.impots.gouv.fr, **BOI-LETTRE-000280** — _Modèles de mention valant certification pour
  des travaux de rénovation_ (22 October 2025)
- bofip.impots.gouv.fr, **BOI-TVA-LIQ-30-20-90-40** — _Modalités d'application_ (22 October
  2025), §§ 90, 100, 220, 230
- legifrance.gouv.fr, **CGI art. 279-0 bis, 3** and **CGI art. 278-0 bis A, IV**
- entreprendre.service-public.gouv.fr, actualité **A18088** (3 March 2025), basis
  loi n° 2025-127 du 14 février 2025, art. 41

### What it is, since 1 March 2025

The cerfa attestations — **1300-SD** "attestation normale" (cerfa 13947) and **1301-SD**
"attestation simplifiée" (cerfa 13948) — **no longer exist**. Since 1 March 2025 the client
(`preneur`) instead writes a **mention valant certification** directly on the **devis or the
facture**. There is no cerfa number and no separate document.

- **Who writes it:** the client, in their own name and capacity as `preneur`. Not the
  contractor, and not a pre-ticked box the contractor prints on the client's behalf.
- **Which rates it conditions:** both reduced rates of **R-004** — 10 % (CGI art. 279-0 bis)
  and 5,5 % (CGI art. 278-0 bis A).

⚠ The impots.gouv.fr **form pages** for 1300-SD and 1301-SD were still serving the 2024 PDFs
with no abolition notice when this was verified. They are stale. The law and BOFiP govern;
do not treat those pages as evidence, and do not ship the old cerfa.

### The wording (BOI-LETTRE-000280)

For **10 %** work under art. 279-0 bis:

> « Je soussigné(e) …………… (Nom, prénom) certifie, en qualité de preneur de la prestation, que
> les travaux réalisés concernent des locaux à usage d'habitation achevés depuis plus de deux
> ans et qu'ils n'ont pas eu pour effet, sur une période de deux ans au plus, de concourir à
> la production d'un immeuble neuf au sens du 2° du 2 du I de l'article 257 du CGI, ni
> d'entraîner une augmentation de la surface de plancher des locaux existants supérieure à
> 10 %. »

For **5,5 %** work under art. 278-0 bis A, the same sentence ending with
« … supérieure à 10 % **et qu'ils ont la nature de travaux de rénovation énergétique.** »

Other wording is accepted provided every substantive element is present.

- **Under 1 000 € TTC — simplified mention** (BOI-TVA-LIQ-30-20-90-40 § 90): client name,
  address, nature of the works, and that the building was completed more than two years ago.
- **Large housing portfolios** (social landlords and similar) may instead use an **annual
  attestation** covering a calendar year (BOI-LETTRE-000280, section III).

### Who is liable when it is missing or wrong

Sourced from BOI-TVA-LIQ-30-20-90-40 §§ 220 and 230, applying CGI art. 279-0 bis, 3 and
CGI art. 278-0 bis A, IV. Do not reason around this.

- **Client solidarily liable** — « Le client est […] solidairement tenu au paiement du
  complément de taxe » where the reduced rate was wrongly applied **because the mention the
  client wrote is inaccurate through their own doing**.
- **Contractor solely liable** in two cases: (a) it applied a reduced rate to **excluded**
  works or equipment — a rate-classification error is the contractor's, and the client's
  certification does not cover it; (b) it **cannot produce the certification** to the
  administration. No mention, no reduced rate, no defence.
- **Cure:** a **facture rectificative** where the client was in good faith and rectifies the
  certification at the time of payment.

The certification is therefore the **contractor's** protection, not paperwork for the client.

### Implementation consequence

- The certification is **structured data on the devis/facture, not an uploaded PDF**. Fields:
  variant (`mention-279-0-bis` | `mention-278-0-bis-A` | `mention-simplifiee-lt-1000` |
  `attestation-annuelle-parc`), client name, date, and the rendered text as accepted.
- A reduced-rate line without a certification on its document is **refused at validation**,
  server-side — blocked, not warned. This is a money-correctness rule (R-004 sets the rate;
  this rule gates it).
- The simplified variant is only selectable while the document total is **< 1 000 € TTC**;
  crossing that threshold on edit must invalidate it and demand the full mention.
- **Factur-X (R-001)**: the certification travels as a document-level note plus the link to
  the devis that carries it.

**Test table for `test-engineer`:** reduced-rate line with no certification → document blocked;
simplified mention on a 1 200 € TTC document → rejected; annual attestation covering the
invoice date → accepted; 5,5 % line carrying only the art. 279-0 bis wording → rejected;
certification present but line is an excluded work (R-004) → line forced to 20 %, document
valid.

### R-009.1 — Retention of the certification

**Status:** TO VERIFY · raised 2026-09-13
The **contractor** attaches the devis/facture carrying the mention to its accounting records
and must be able to produce it on demand; the **client** keeps a copy. The period is **five
years**, ending 31 December. Unresolved is only the **start point**: **R-004.1** holds the
conflict between `achèvement` and `facturation` and the sources on each side.

**Interim rule, safe under both:** retain until `31 December of year(max(achèvement,
facturation)) + 5`. Implement this now; it is never shorter than either reading.

**What settles it:** the same read that settles **R-004.1**. Feeds **R-008**.

**Test table for `test-engineer`:** retention date computed as 31 Dec of
year(max(achèvement, facturation)) + 5, asserted with achèvement later than facturation and
with facturation later than achèvement.

---

## R-010 — Client SIREN as a mandatory invoice mention (B2B)

**Status:** CONFIRMED · verified 2026-09-13
**Source:**

- legifrance.gouv.fr, **CGI annexe II art. 242 nonies A, 1°** — version en vigueur depuis
  2025-01-01, modifiée par décret n° 2024-1195 du 21 décembre 2024
- legifrance.gouv.fr, **C. com. art. R. 123-221** — version en vigueur depuis 2023-01-01
- legifrance.gouv.fr, **décret n° 2022-1299 du 7 octobre 2022**, art. 1 (insertion);
  its art. 3 has since been replaced, see below
- legifrance.gouv.fr, **décret n° 2024-266 du 25 mars 2024**, art. 2
- legifrance.gouv.fr, **C. com. art. L441-9** — version en vigueur depuis 2019-04-26
- legifrance.gouv.fr, **CGI art. 1737, II**
- entreprendre.service-public.gouv.fr, fiche **F31808** — page states « vérifié le
  11 août 2026 »

### The rule

- **CGI annexe II art. 242 nonies A, 1°** requires the invoice to carry « le nom complet, le
  numéro d'identification mentionné au premier alinéa de l'article R. 123-221 du code de
  commerce et l'adresse de l'assujetti **et de son client** ». The client's identification
  number is a mandatory mention, not an optional courtesy.
- **C. com. art. R. 123-221**: alinéa 1 is « un numéro d'ordre composé de **neuf chiffres** »
  attributed to the `unité légale` — the SIREN. Alinéa 2 is the establishment number, those
  nine digits plus five more — the SIRET, fourteen. The CGI points at the **first** alinéa, so
  the mandatory mention is the **SIREN**. Do not narrow the field to a SIRET shape.
- **Entry into force.** The mention was inserted by décret n° 2022-1299, art. 1 (« au 1°, après
  les mots : "le nom complet", sont insérés les mots : ", le numéro d'identification mentionné
  au premier alinéa de l'article R. 123-221 du code de commerce" »). That décret's art. 3 was
  **replaced in full** by décret n° 2024-266, art. 2: the mention applies to invoices **issued
  from 1 September 2026**, and from **1 September 2027** for micro-entreprises and PME that are
  not members of an `assujetti unique`. The calendar is keyed to the **issuer's** size — the
  same axis as R-001, and inherited from it. Cite décret 2024-266 for the dates; the 2022
  version of art. 3 is no longer the law.
- **B2B only.** The obligation bears on the client's identification number as an `assujetti`.
  A `particulier` has none, so a B2C invoice carries no client SIREN — F31808 words the mention
  as « numéro Siren du client, **lorsqu'il s'agit d'une entreprise** ». **Client type is
  load-bearing**: it decides whether the mention is required at all.
- **C. com. art. L441-9 does not carry this obligation.** Read in full, its I lists the names,
  addresses and billing addresses of the parties, the date, quantity, denomination, unit price
  HT, price reductions, payment due date, discount terms, penalty rate, the recovery indemnity
  and the purchase-order number — and **no identification number for either party**. The
  requirement comes from the CGI annexe II, not the commercial code. Cite the right one.
- **Sanction:** **CGI art. 1737, II** — « toute omission ou inexactitude » in an invoice draws
  a fine of **15 €** per mention, capped per invoice at **a quarter of the amount** stated or
  which should have been stated. The fine covers optional mentions as well as mandatory ones,
  and is not applied on a first infraction in the current year and the three preceding ones
  where the error is corrected spontaneously or within thirty days of a first request.

### R-010.1 — Does a missing buyer SIREN cause rejection by the annuaire?

**Status:** TO VERIFY · raised 2026-09-13
Separate question from the legal obligation: whether a structured invoice missing the buyer
SIREN is **rejected outright** at platform routing, or merely non-compliant. This changes
whether our validation blocks issuance or warns.

**What settles it:** the DGFiP **spécifications externes B2B v3.2 (30/04/2026)** on
impots.gouv.fr — still not read as of 2026-09-13.

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

---

## How to add a rule

Copy the block shape above. No rule enters the code before its status is `CONFIRMED`.
When in doubt, the answer is "ask the client's accountant", not "implement our best guess".
