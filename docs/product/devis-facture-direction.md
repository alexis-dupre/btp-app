# Product direction — Devis & Facture

Status: **draft for review** · 2026-09-13 · feeds `bmad-spec`, not a substitute for it.

Sources: two real SoRenov devis (`I-26-07-24`, 8 pages, 72 051 € HT; `I-26-09-1`, 4 pages,
56 423 € HT), a reverse-engineering spec of Costructor v1.24.24, and decisions taken with
Alexis on 2026-09-13.

---

## 1. Who this is for

**The owner of a small renovation business, writing his own devis.** Not a chargé
d'affaires, not a métreur, not a bid team. He knows his prices; they are in his head and in
his past devis. He writes at his desk in the evening, or in the car after a site visit.

Scope: **devis and facture**. No public-tender response (DPGF/DQE), no chantier module in
v1 — SoRenov's own devis carry the site address as a plain text line, so a `chantier` entity
is not on the critical path.

## 2. Positioning against Costructor

Costructor already has voice dictation, full AI generation in 25–30 s, three price
databases, and a complete margin engine. Competing on "AI writes your devis" means arriving
second, two years late.

But look at what their AI produces: net margin displayed at 371 %, purchase price at zero on
every lump-sum line, and generic sections (*Travaux préparatoires et dépose*, *Plomberie et
sanitaires*). **Their AI writes a devis. It does not write SoRenov's devis.**

Open the two real PDFs and there is a signature: *Fourniture et pose de…*, *Mise en
déchetterie de l'ensemble*, *Entoilage complet / Enduit, 2 passes / Ponçage, dépoussiérage /
Impression 1 couche, Zolpan Prim universel blanc*. And stable prices: 22, 26, 28, 32, 55,
125, 130, 145 €/unit. *Préparation des murs* appears six times, word for word, at 22 €/m².

**The differentiator is the customer's own corpus.** Import their past devis, extract their
phrasings and their prices, and generate in their language. A generic devis is spotted in
three seconds. One that reads like theirs is not.

## 3. What we deliberately do not build

**The whole margin engine.** Purchase price, déboursé, frais généraux, coût de revient,
marge nette, composite `ouvrage détaillé`, bulk margin adjustment, Batiprix, CostLib. That is
roughly a third of the competitor's module.

Justification: neither SoRenov devis contains a purchase price, a sub-detail, or any margin
analysis. That machinery serves a structured firm with a métreur and a bid process. Our user
knows his margin.

**Signal this was wrong:** the first pilot who asks "and where do I see my margin?" in the
first week. If two of the first five ask, the cut was wrong and Epic B comes back.

Also out of v1: chantier module, supplier documents (bon de commande, demande de prix),
bordereau de chantier, planning, DPGF import, Chrome plugin, collaborative price database.

## 4. What the real devis impose on the data model

These are not preferences. They are observations from documents a customer sends to his
clients today.

1. **A designation is a rich block, never a string.** It is a title followed by a
   decomposition, and that decomposition is what sells the work. `Préparation des murs : /
   Entoilage complet / Enduit, 2 passes / …` is one line. Any model with `designation
   varchar` has already lost.
2. **Three kinds of item.** A priced line; a section title (`Cuisine`, `Salon`, `Travaux
   supplémentaire`); and a **plain text line inside the table** (`Adresse du chantier : 13
   rue Tronchet 75008 Paris`). The third is easy to forget and appears in both documents.
3. **Sections are optional, flat, and freely named.** One devis groups by room, the other has
   no sections at all. No imposed 1 / 1.1 / 1.1.1 hierarchy. Automatic numbering is an option,
   not the structure.
4. **Unit is free text with suggestions.** Observed: `m2`, `ml`, `ENS`, `forfait`, `pièce(s)`,
   `Offert`, and one line with **no unit at all** (the 23 675 € electrical works). The field
   must tolerate empty and arbitrary text.
5. **"Offert" is a line attribute, not a unit.** Quantity 1, unit `Offert`, PU 320 €, total
   0 €. A commercial gesture that shows the value and charges nothing. Model it as a flag;
   the current form is a workaround in their tool.
6. **VAT is per line**, and the same devis can mix rates. Rate is stored on the line as
   applied, never looked up at render time.
7. **A devis carries the company's legal identity**: SIRET, TVA intracommunautaire, RCS,
   capital, code NAF, and **décennale insurer with contract number**. All of it is on
   SoRenov's footer. This is company configuration, printed on every document.

## 5. Numbering — one thing to settle

SoRenov's format is `I-<YY>-<MM>-<n>`. Per Alexis, `n` counts devis within the period. This
is fine for a devis, which has no legal numbering constraint.

**It is not fine for a facture.** French invoice numbering must be a continuous,
chronological sequence with no gaps. So: devis numbering is configurable per company and
freely formatted; facture numbering is a locked sequence, assigned at finalisation, and the
configuration freezes as soon as one facture has been issued. Two different mechanisms —
do not share one implementation between them.

`(PROVISOIRE)` on the second devis is what their tool prints when you export before
finalising. Keep the behaviour: a draft export is watermarked, and carries no number.

## 6. The epics, in order

The ordering is driven by one question: what is the shortest path to SoRenov actually using
this instead of Henrri?

### E0 — Walking skeleton
Auth, organisation, tenancy layer, minimal client contact (particulier / professionnel),
company settings with the legal mentions of §4.7. Nothing else. This is the epic that
validates the tenancy boundary everything else depends on; its first two stories are built
with a human in the loop.

### E1 — The devis document
The data model of §4, and an editor that can produce `I-26-07-24` exactly. Sections, three
item kinds, rich designation, quantity / unit / PU / VAT per line, line discount and global
discount, acomptes with triggers, totals, draft → finalised, numbering, revisions.

**Acceptance:** a human can re-create both SoRenov devis in the editor, and the stored data
represents them without loss.

### E2 — Corpus import *(the real test of E1)*
A deterministic parser for Henrri-generated PDFs: sections, lines, designations, quantities,
units, prices, VAT. All of SoRenov's devis imported. Pure function in `lib/domain/`, no I/O,
exhaustively unit-tested against the real files.

**Acceptance:** round trip. Import a Henrri PDF, regenerate our own PDF, compare line by
line. Every divergence is either a model gap or a parser bug, and both must be named.

Output: the customer's price library and phrasing corpus, built without them typing anything.

### E3 — PDF export
Their document, not ours. Company logo and legal footer, configurable colour and typography,
the column set of their current devis, signature block, payment terms, bank details, totals
with VAT breakdown. Draft watermark. The PDF is a render, regenerable at any time — never
the source of truth.

**Acceptance:** SoRenov's client cannot tell which tool produced the document.

### E4 — Facture
Acompte and solde from an accepted devis. Locked sequential numbering. **Issued invoices are
immutable — corrections are an `avoir`.** Designed from day one around a structured document
and a lifecycle, because of R-001: receiving electronic invoices through an approved platform
has been mandatory since 1 September 2026, and issuing becomes mandatory for TPE/PME on
1 September 2027. Retrofitting that is a rewrite.

### E5 — Voice
Not "dictate a devis". **Dictate a room.** The 8-page devis is ~50 lines; nobody dictates
that in one take. *"Chambre 1 : préparation murs 36 m², plafonds 14 m², peinture murs,
peinture plafonds"* → four lines, thirty seconds, then the next room. The devis accumulates;
the editor corrects.

Grounded in the E2 corpus: their phrasings, their prices, their structure. Context stated
once at the start (5th floor, no lift, large window) shifts the lump-sum lines.

### E6 — Keyboard speed
Only once E5 has shown what is still slow. Duplicate a line, duplicate a room, move between
cells, re-use the previous line. Designed from observed friction, not from a guess.

## 7. Open questions

| # | Question | Blocks |
|---|---|---|
| 1 | Does `n` in `I-26-07-24` count per day or per month? The document is dated 29 July and `n` = 24. | E1 numbering |
| 2 | Options — lines the client can accept or decline, excluded from the total. Absent from both devis; does SoRenov use them? | E1 model |
| 3 | Are all pilot devis Henrri-generated, or are some from another tool? | E2 parser scope |
| 4 | Who sends the devis today, and how — email with PDF attached, printed, in person? | E3 / E4 |
| 5 | R-004 (renovation VAT rates) is `TO VERIFY` in the register. Both devis use 10 % on housing and 20 % on a commercial fit-out. | E1 — blocking |
