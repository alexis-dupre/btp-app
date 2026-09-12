# BTP glossary — French domain terms

The UI is in French, the code is in English. This table is the contract between the two.
When a domain term has no good English equivalent, keep the French word in the code and
write it here. Inventing an English name for `situation de travaux` costs more than it saves.

| French | Code identifier | Meaning |
|---|---|---|
| Chantier | `chantier` | A construction site / project. The central aggregate. |
| Maître d'ouvrage | `client` / `owner` | The client who commissions and pays for the works. |
| Maître d'œuvre | `projectManager` | Architect or firm supervising execution for the owner. |
| Conducteur de travaux | `siteManager` | Manages several chantiers: planning, cost, resources. |
| Chef de chantier | `foreman` | On site daily: teams, execution, safety. |
| Lot | `lot` | A trade package (gros œuvre, plomberie, électricité...). |
| Ouvrage | `workItem` | A unit of work inside a lot, with a unit price. |
| Sous-détail de prix | `priceBreakdown` | Labour + materials + plant + margin behind a unit price. |
| Devis | `devis` (quote) | The priced offer. Becomes the `marché` once signed. |
| Marché | `contract` | The signed contract: scope, price, deadlines, penalties. |
| Avenant | `amendment` | A contractual change to the marché: scope and/or price. |
| Situation de travaux | `situation` | Monthly progress billing based on **cumulative** completion. |
| Avancement | `progress` | Percentage of an ouvrage completed to date. |
| Retenue de garantie | `retention` | A share withheld from each payment as a warranty. |
| Caution bancaire | `bankGuarantee` | A bank guarantee substituted for the retention. |
| Compte prorata | `prorataAccount` | Shared site costs split between the companies present. |
| Révision / actualisation de prix | `priceIndexation` | Index-based price adjustment over the contract's life. |
| DGD (décompte général définitif) | `finalStatement` | The final account closing the marché. |
| Facture | `invoice` | The invoice. Immutable once issued. |
| Avoir | `creditNote` | The credit note, the only way to correct an issued invoice. |
| Autoliquidation | `reverseCharge` | VAT accounted for by the client, not the supplier. |
| Pointage | `timeEntry` | Hours recorded per person, per chantier, per task. |
| Intempéries | `weatherStoppage` | Weather stoppage — a compensable, declarable event. |
| Réserves | `snagItems` | Defects listed at handover, to be cleared. |
| PV de réception | `handoverReport` | The formal acceptance record; starts the warranty clocks. |
| PPSPS | `safetyPlan` | Site-specific health and safety plan. |
| DOE | `asBuiltFile` | As-built documentation handed over at completion. |
| Décennale | `tenYearWarranty` | Ten-year structural liability insurance. |
