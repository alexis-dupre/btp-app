# Client contact — field set and its resolution

Two sources disagree, and the disagreement is the point.

- **`docs/product/sources/costructor-devis-spec.md` §5.1** is what the competitor _collects_:
  a three-tab modal with accounting, CRM and multi-value fields.
- **The two real devis** are what SoRenov _prints_: a name and a postal address. Nothing else.
  Not even the company client's SIRET.

The competitor's own appearance panel (§5.9) explains the gap — client SIREN/SIRET, phone and
email are printable but off by default. SoRenov never turned them on.

The rule applied below: **a field is collected in E0 only if something inside E0, E1 or the
sending of the document consumes it.** Everything else is recorded here as a known future
need, with the module that will need it. An uncollected field costs nothing; a collected
field nobody uses becomes a form question the user answers for no reason, and personal data
we hold without a purpose.

## Verdicts

`required` — a contact cannot be saved without it.
`optional` — collected, may be empty.
`future` — not collected in E0. Named here so it is a decision, not an omission.

### Shared

| Field                                   | Competitor §5.1            | On the two devis                 | E0                               | Reason                                                                                                                                                                                         |
| --------------------------------------- | -------------------------- | -------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type (`particulier` \| `professionnel`) | toggle                     | implied by the shape of the name | **required**                     | Decides which name field applies and, later, VAT treatment                                                                                                                                     |
| Postal address                          | `Adresse(s)`, repeatable   | printed, one address             | **required**, single, structured | The only client data besides the name that the document prints. Structured (line 1, line 2, postal code, city, country) because R-001 makes a structured address part of an electronic invoice |
| Email                                   | `Email(s)`, repeatable     | absent                           | **optional**, single             | Consumed by sending the devis and later the facture. A devis that cannot be sent is useless                                                                                                    |
| Phone                                   | `Téléphone(s)`, repeatable | absent                           | **optional**, single             | Same scope: contacting the client about a document the product produced                                                                                                                        |
| Repeatable addresses / emails / phones  | yes                        | one of each                      | **future**                       | No consumer until a client has a billing address distinct from the site address                                                                                                                |
| `Prospect` vs `Client`                  | modal title offers both    | n/a                              | **future**                       | CRM concern; E0 has no pipeline to track                                                                                                                                                       |

### Particulier

| Field      | Competitor §5.1 | On the two devis | E0           | Reason                                                                      |
| ---------- | --------------- | ---------------- | ------------ | --------------------------------------------------------------------------- |
| `Nom`      | required        | `CAHN`           | **required** |                                                                             |
| `Prénom`   | optional        | `Stéphanie`      | **optional** | Printed when present — the document line reads `Stéphanie CAHN`             |
| `Civilité` | collected       | absent           | **future**   | Nothing renders it. Needed when the product writes an email salutation (E3) |

### Professionnel

| Field               | Competitor §5.1 | On the two devis | E0           | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | --------------- | ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Nom de la société` | required        | `AB COFFEE LAB`  | **required** |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `N° SIREN/SIRET`    | collected       | absent           | **optional** | R-001 (CONFIRMED) makes the client's identification part of a structured invoice. The field must exist before E4 and costs nothing to fill early. A rule drafted as R-010 and awaiting entry in the register (handed to the `domain` stream in `docs/backlog/handoff-r010-siren.md`) finds the mandatory mention to be the **SIREN**, nine digits, not the SIRET — do not narrow this field to a SIRET shape. It stays optional on the contact either way; the blocking validation is E4's, at issuance. See SPEC.md |
| `N° de TVA`         | collected       | absent           | **future**   | Its consumers are intra-community supply and the reverse charge of R-003, which is `TO VERIFY` and out of scope until E4                                                                                                                                                                                                                                                                                                                                                                                             |
| `Interlocuteurs`    | collected       | absent           | **future**   | A named person inside the client company, needed when E3 sends the document to someone rather than to a company mailbox                                                                                                                                                                                                                                                                                                                                                                                              |

### Tab _Comptabilité_ — none of it in E0

| Field                          | E0         | Reason                                                                                                                                                                                                                     |
| ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Compte auxiliaire`            | **future** | There is no chart of accounts and no accounting export in the product                                                                                                                                                      |
| `Taux de TVA par défaut`       | **future** | R-004 is `TO VERIFY`; a default VAT rate must not be stored before the rates are sourced. Per §4.6 of the direction the rate lives on the devis line as applied, so a client default is a convenience, never the authority |
| `Délai de paiement par défaut` | **future** | Consumed by facture due dates (E4)                                                                                                                                                                                         |

### Tab _Autres_ — none of it in E0

| Field               | E0         | Reason                                                                  |
| ------------------- | ---------- | ----------------------------------------------------------------------- |
| `Notes` (rich text) | **future** |                                                                         |
| `Responsable`       | **future** | Requires more than one user in the organisation, which E0 does not have |

## Display name is derived, never stored

The document prints one client line. E0 derives it and stores no second copy:

- `particulier` — `Prénom NOM`, or `NOM` when the first name is empty.
- `professionnel` — the company name.

Storing a separate display field is the same defect as the NAF divergence in
`company-legal-identity.md`: one fact, two places to edit, two values in the end.

## Personal data

A `particulier` is a named natural person with a postal address, and optionally an email and a
phone number. This is the first personal data the product holds, and it lands in E0.

`30-security.md` §8 asks for export, deletion and a read audit trail "from the start". E0
delivers none of the three; their deferral is an ADR with an observable trigger — before the
second paying organisation is onboarded, or on the first user request, whichever comes first.
What E0 does ship is what makes the retrofit possible: every contact carries a creation
timestamp and a stable subject identifier that survives an edit to the person's details.
