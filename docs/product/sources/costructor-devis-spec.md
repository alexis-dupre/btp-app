# Costructor — Module Devis
## Spécification produit détaillée (reverse engineering en vue d'un rebuild)

| | |
|---|---|
| **Produit analysé** | Costructor v1.24.24 — `app.costructor.co` |
| **Module** | Ventes › Devis (`/quotes`) |
| **Date de l'analyse** | 13 septembre 2026 |
| **Méthode** | Navigation exhaustive de l'UI sur un compte d'essai (14 j), création d'un devis de test finalisé + révisé, génération d'un devis par IA, relevé des écrans de paramétrage |
| **Portée** | Tout ce qui est atteignable depuis le module Devis : liste, éditeur, aperçu, fiche devis, portail client, réglages, conversions sortantes |
| **Hors portée** | Fonctionnement interne des modules Factures, Chantiers, Bons de commande / livraison / intervention (décrits uniquement au niveau des interfaces avec le devis) |

> **Limites de l'analyse.** Le compte est en période d'essai : la signature électronique, les modèles d'emails personnalisés, les thèmes d'apparence Premium et les bases de prix Batiprix / CostLib sont visibles mais non exécutables. Les comportements de ces briques sont décrits d'après leurs écrans de présentation et signalés comme **[à confirmer]**. La bibliothèque produit du compte étant vide, les écrans de recherche de prix n'ont pas pu être observés avec des résultats réels.

---

## 1. Positionnement fonctionnel

Le module Devis est le point d'entrée du cycle de vente d'une entreprise du BTP. Il remplit quatre rôles distincts que le rebuild doit traiter séparément :

1. **Un éditeur de document commercial** — structuration hiérarchique (en-tête, sections, sous-sections, lignes, textes, sauts de page), rendu PDF paramétrable, mise en forme riche.
2. **Un moteur de chiffrage** — prix d'achat, marge, déboursé, frais généraux, coût de revient, marge nette, par ligne / par catégorie / par ouvrage composé.
3. **Un outil de suivi commercial** — statuts, dates de validité, relances, révisions, journal d'événements, partage client.
4. **Un point de départ de la chaîne documentaire** — conversion vers facture (acompte / situation / finale), bon de commande, bon de livraison, bon d'intervention, bon de commande fournisseur, demande de prix, bordereau de chantier, modèle de devis.

Un rebuild qui ne traiterait que le point 1 raterait l'essentiel : c'est le moteur de chiffrage (2) et la chaîne documentaire (4) qui créent la valeur métier.

---

## 2. Modèle de données déduit

### 2.1 Entité `Quote` (devis)

| Champ | Type | Notes |
|---|---|---|
| `id` | ULID préfixé `quote_…` | Ex. `quote_01m2dazs1dfxjz8k9cv8eb6cr9` |
| `number` | string | Format configurable, ex. `D202600001`. Attribué **à la finalisation**, pas à la création |
| `revision` | int | 0 = devis initial. Incrémenté à chaque nouvelle finalisation après modification |
| `status` | enum | `brouillon` \| `en_attente` \| `envoye` \| `accepte` \| `refuse` \| `annule` \| `facture` |
| `archived` | bool | Vue « Devis archivés » séparée |
| `client_id` | FK Contact | Obligatoire pour finaliser |
| `project_id` | FK Chantier | Optionnel, via « Associer à un chantier » |
| `site_label` | string | « Intitulé du chantier », facultatif |
| `site_address` | adresse | « Adresse des travaux » |
| `issued_at` | date | Date d'émission, par défaut = aujourd'hui |
| `expires_at` | date | Par défaut : `issued_at` + N jours (N paramétrable, défaut 30) |
| `survey_at` | date | « Visite préalable », optionnel |
| `works_start_at` | date | « Début des travaux », optionnel, activable par défaut |
| `duration_value` / `duration_unit` | int / enum | « Durée estimée » (jours, …), activable par défaut |
| `header_html` | richtext | Bloc d'en-tête optionnel |
| `footer_notes` | richtext | Notes de bas de page |
| `internal_name` | string | Non affiché au client |
| `owner_id` | FK Membre | « Responsable », non affiché au client |
| `internal_notes` | richtext | Non affiché au client |
| `po_number` | string | « N° de bon de commande » client |
| `payment_methods` | set | virement, chèque, espèces, CB, financement, prélèvement, LCR |
| `payment_terms` | richtext | « Conditions de paiement » |
| `vat_mention` | enum | Voir §6.6 |
| `vat_rounding` | enum | `somme_des_arrondis_par_ligne` \| `arrondi_de_la_somme` |
| `reverse_charge` | bool | Autoliquidation au niveau document |
| `retention_rate` | decimal | Retenue de garantie, défaut 5 % |
| `global_discount` | {valeur, unité %/€} | Remise globale |
| `appearance` | objet | Voir §6.4 — surcharge locale du thème société |
| `display_options` | objet | ~20 booléens (§5.7), chacun avec une portée **Éditeur** et une portée **Document** |
| `share_token` | string | Lien public `client.costructor.co/d/cpy_…/<token>` |
| `profitability_enabled` | bool | Active le bloc « Rentabilité prévue » |

### 2.2 Lignes — `QuoteItem`

Structure **arborescente** : un devis contient une liste ordonnée d'items, dont certains (sections) contiennent eux-mêmes des items.

| Type d'item | Contenu | Comportement |
|---|---|---|
| `section` | Titre, items enfants | Repliable, sous-total affiché à droite, TVA modifiable en masse pour toute la section, peut être rendue optionnelle |
| `sous_section` | Idem, niveau 2 | Uniquement à l'intérieur d'une section |
| `ligne` | Ligne chiffrée (voir ci-dessous) | 5 natures possibles |
| `texte` | Bloc de texte riche | Non chiffré |
| `saut_de_ligne` | Espacement | Mise en page |
| `saut_de_page` | Rupture de page PDF | Mise en page, niveau racine uniquement |

**Natures de ligne** (`item_type`) : `fourniture`, `main_d_oeuvre`, `ouvrage_detaille`, `materiel`, `sous_traitance`. La nature pilote le regroupement dans l'analyse de rentabilité et dans les outils d'ajustement de marge.

Champs d'une ligne chiffrée :

| Champ | Notes |
|---|---|
| `designation` | Texte riche : gras, italique, barré, souligné, couleur, surlignage, listes à puces et numérotées, lien |
| `reference` | Référence produit, affichable en option |
| `quantity` | Décimal |
| `unit` | ~40 unités : u, h, ens, fft, l, t, kW, km, ha, dm, mm, A, KW, m².K/W, min, mois, pièce, Unité de Mesure, F, PCE, CAR, m², ml, m³, m, kg, j, ms, cm, dm³, p, mm², W, V, an, sac, Pièce(s), Forfait, pc, k€, Unité, Mètre Linéaire… |
| `purchase_unit_price` | PA.U. HT — visible si le calcul des marges est activé |
| `margin_rate` | % — verrouillable (cadenas) pour figer prix de vente ou marge |
| `unit_price` | PRIX U. HT |
| `vat_rate` | 2,10 / 5,50 / 8,50 / 10 / 20 % · Autoliquidation · Multitaux · Intracom. · Extracom. · Aucune |
| `discount` | Remise de ligne, en % ou en € HT (colonne masquée tant qu'aucune remise n'existe) |
| `is_optional` | « Rendre optionnel » — la ligne sort du total |
| `forced_number` | « Forcer le N° de ligne » |
| `product_account` | Compte de produit comptable, défaut = compte par défaut |
| `image` | Image insérable, position et taille pilotées par l'apparence |

### 2.3 Ouvrage détaillé — `QuoteItem` composite

Un ouvrage détaillé agrège des **éléments** (fournitures, main-d'œuvre, matériels…), chacun avec sa quantité, son unité et son prix d'achat. Le prix d'achat de l'ouvrage est la somme des éléments ; le prix de vente en découle via un taux de marge brute, ou peut être saisi manuellement.

Écran « Éléments de l'ouvrage pour 1 u » :

- Tableau des éléments : élément · nature · QTÉ · UNITÉ · P.A. HT · (cadenas) · P.U. HT · MARGE · TOTAL HT · suppression
- Actions : « Ajouter un élément », « Ajuster la marge par élément »
- Bascules d'affichage : « Voir la réf. des éléments », « Voir la marge par élément »
- Synthèse : **Prix d'achat HT** (calculé) → **Taux de marge brute** → **Prix de vente HT** (requis), avec bascule « Saisir manuellement le prix de vente »
- Barre empilée de répartition : Main d'œuvre / Fourniture / Frais gén. / Marge nette, avec montants au survol

L'option document « Masquer les détails des ouvrages » contrôle si les éléments apparaissent au client ; deux sous-options règlent l'affichage du prix et de la quantité des éléments.

### 2.4 Totaux — ordre de calcul observé

```
Total HT (somme des lignes non optionnelles, remises de ligne appliquées)
  − Remise globale (% ou € HT)
  ± Ajustements HT           → Révision de prix | Escompte | Compte prorata
                                | Acompte d'un autre logiciel | Autre
= Base TVA
  + TVA (par taux, méthode d'arrondi paramétrable)
= Total TTC
  ± Ajustements sur Net à payer → Prime énergie | Paiement direct | Débours | Autre
= Net à payer
```

La **retenue de garantie** (défaut 5 %) est affichée à part avec son montant estimé ; elle ne modifie pas le Net à payer du devis.

### 2.5 Acomptes — `QuoteDeposit`

Liste ordonnée d'échéances. Chaque acompte : montant (% ou €) + déclencheur parmi `à la signature`, `à la commande`, `au début des travaux`, `à la moitié des travaux`, `libellé personnalisé`. Des acomptes par défaut sont configurables au niveau société.

### 2.6 Révisions — `QuoteRevision`

Chaque finalisation d'un devis déjà finalisé crée une révision. L'historique liste les versions (« Devis initial », puis les suivantes) avec, par version : aperçu, téléchargement, impression, **restauration**, duplication.

---

## 3. Cycle de vie et règles d'état

### 3.1 Machine à états

```
                 ┌────────────┐
                 │ Brouillon  │  numéro non attribué, filigrane "Brouillon"
                 └─────┬──────┘
             Finaliser │  (contrôles : client requis)
                       ▼
                 ┌────────────┐
        ┌────────│ En attente │────────┐
        │        └─────┬──────┘        │
  Marquer comme        │ Envoyer       │ Marquer comme refusé / annulé
     envoyé            ▼               ▼
        │        ┌────────────┐   ┌──────────────────┐
        └───────►│  Envoyé    │   │ Refusé | Annulé  │
                 └─────┬──────┘   └──────────────────┘
      Accepter / signer │
                        ▼
                 ┌────────────┐
                 │  Accepté   │  → apparaît dans l'onglet « À facturer »
                 └─────┬──────┘
                       │ Facturer
                       ▼
                 ┌────────────┐
                 │  Facturé   │
                 └────────────┘
```

### 3.2 Règles de gestion observées

| # | Règle |
|---|---|
| RG-01 | Le **numéro** n'est attribué qu'à la finalisation. Tant que le devis est brouillon, la liste affiche « Brouillon » en italique à la place du numéro. |
| RG-02 | La **finalisation exige un client**. L'écran de contrôle affiche « Client — Manquant » en rouge ; les autres manques sont de simples « Recommandations » (ex. « Indiquez une date de début des travaux »). |
| RG-03 | La configuration de numérotation est **verrouillée dès qu'un document a été finalisé** avec elle (« afin de garantir l'intégrité de la séquence »). |
| RG-04 | **Modifier un devis finalisé ouvre une révision** (titre « Révision du devis nº … »). À la re-finalisation, le numéro est conservé et un compteur « N Révision(s) » apparaît. |
| RG-05 | **Une révision réinitialise le statut** : un devis Accepté repasse En attente après révision. *(Observé sur le devis de test ; à valider sur un devis déjà facturé — probablement bloqué.)* |
| RG-06 | « **Facturer** » depuis un devis En attente déclenche un avertissement : le devis sera automatiquement marqué **Accepté**. |
| RG-07 | Un devis **Accepté** bascule dans l'onglet « À facturer » de la liste (et non dans un onglet « Accepté » dédié — les onglets sont orientés action, pas statut). |
| RG-08 | Les **lignes optionnelles** et **sections optionnelles** sont exclues des totaux. |
| RG-09 | La **date d'expiration** alimente un compte à rebours affiché sur la fiche (« 30 jours restants »). Passé le délai, le devis bascule vraisemblablement dans l'onglet « Perdus » **[à confirmer]**. |
| RG-10 | L'**arrondi de TVA** est un choix explicite du document : somme des arrondis par ligne, ou arrondi de la somme des lignes. |
| RG-11 | Les acomptes, la retenue de garantie, la remise globale et les ajustements sont tous **optionnels et ajoutables/supprimables à l'unité**. |

### 3.3 Journal d'événements

La fiche devis tient une timeline horodatée : `Devis créé` → `Devis finalisé` → `Devis modifié` → `Devis accepté` → … Elle doit être répliquée : c'est la seule trace d'audit visible côté utilisateur.

---

## 4. Écran 1 — Liste des devis (`/quotes`)

### 4.1 Structure

- **Titre** « Devis »
- **Actions principales** : `Nouveau devis` (+ menu déroulant : *Créer à partir d'un modèle*), `Devis par IA`, `Exporter`, `Importer` (menu), `⋮` (menu)
- **Onglets de synthèse** — chacun affiche un compteur ET un montant cumulé :
  `Tous` · `Brouillons` · `En attente` · `Envoyés` · `À facturer` · `Facturés` · `Perdus`
- **Barre de filtres** : recherche plein texte, `Statut` (multi-sélection : Brouillon, En attente, Accepté, Refusé, Annulé + bouton Appliquer), `Client`, `Chantier`, `Responsable`, `Date d'émission` (raccourcis *Ce mois-ci, 30 derniers jours, Le mois dernier, 3 derniers mois, Cette année, L'année dernière, 12 derniers mois* + double calendrier début/fin)
- **Tableau** : NUMÉRO · MONTANT TTC · (badge statut) · CLIENT · CHANTIER · DATE D'ÉMISSION (triable) · DATE D'EXPIRATION
- **Préférences de colonnes** (roue crantée) : *Afficher les montants HT*, *Afficher le net à payer*, *Afficher le responsable*, *Afficher le reste à facturer*
- **Pagination** : sélecteur 25 / … · « Lignes 1 à N sur M »

### 4.2 Actions de ligne

Au survol : `Supprimer` · `Dupliquer` · `Partager` · `Modifier` · `⋮` → *Voir*, *Télécharger*, *Archiver*.

### 4.3 Export

Modale « Exporter des devis » : format **CSV / XLSX**, bascule *Inclure les fichiers PDF*, sélecteur de **période** (plage de dates).

### 4.4 Import

Menu dédié : *Importer un devis / DPGF / DQE au format Excel / CSV* — *Importer un devis au format PDF*.
L'import DPGF/DQE est un différenciateur fort sur le marché français (réponse à appel d'offres) ; l'import PDF suppose une extraction automatique de lignes **[à confirmer]**.

### 4.5 Menu `⋮`

*Modèles de devis* (panneau latéral : recherche + « Créer un modèle ») · *Devis archivés* · *Paramètres des devis*.

---

## 5. Écran 2 — Éditeur de devis (`/quotes/<id>`)

Plein écran, hors layout applicatif. Enregistrement automatique (icône nuage) + `Enregistrer` explicite, **annuler / rétablir** (undo/redo), suppression, `Aperçu`, `Enregistrer et finaliser`, fermeture.

Barre d'outils : `Batiprix` · `CostLib` · `Pièces jointes (n)` · `Outils` · `Apparence` · `Options` · `Aide`.

### 5.1 Bloc identité

| Zone | Contenu |
|---|---|
| **Client** | Autocomplete sur les contacts + « Nouveau client ». Une fois choisi : nom, adresse, bouton *Modifier* |
| **Adresse des travaux** | Intitulé du chantier (facultatif) + adresse libre, ou **Associer à un chantier** (autocomplete sur les chantiers + « Nouveau chantier ») |
| **Dates** | Date d'émission · Date d'expiration · Visite préalable · Début des travaux · Durée estimée (valeur + unité) |

**Création de contact en ligne** — modale « Ajouter un [Client | Prospect] », 3 onglets :
- *Informations* — bascule **Particulier / Professionnel**.
  Particulier : Civilité, Nom (requis), Prénom, Adresse(s), Email(s), Téléphone(s).
  Professionnel : Nom de la société (requis), N° SIREN/SIRET, N° de TVA, Adresse(s), Email(s), Téléphone(s), **Interlocuteurs**.
- *Comptabilité* — Compte auxiliaire (généré, forçable), Taux de TVA par défaut, Délai de paiement par défaut (30 j).
- *Autres* — Notes (texte riche), Responsable.

### 5.2 En-tête de document

Bloc optionnel « Ajouter un en-tête » : éditeur riche complet (gras, italique, barré, souligné, couleur, surlignage, paragraphe, H1/H2/H3, 4 alignements + justifié, listes, lien, effacer la mise en forme). Supprimable.

### 5.3 Corps — tableau de lignes

Colonnes par défaut : DÉSIGNATION · QTÉ. · UNITÉ · PRIX U. HT · TVA · TOTAL HT.
Avec le calcul des marges activé : DÉSIGNATION · QTÉ. · UNITÉ · **PA.U. HT** · **MARGE** · (cadenas) · PRIX U. HT · TVA · [REMISE] · TOTAL HT.

**Insertion** — au niveau racine : `Nouvelle ligne` (menu : Fourniture / Main-d'œuvre / Ouvrage détaillé / Matériel / Sous-traitance) · `Section` · `Texte` · `Saut de ligne` · `Saut de page`.
À l'intérieur d'une section : `Nouvelle ligne` · `Sous-section` · `Texte` · `Saut de ligne`.

**Réorganisation** : poignée de glisser-déposer à gauche de chaque item, plus flèches ↑ / ↓. Zone de dépôt explicite dans les sections vides (« Ajoutez ou glissez-déposez une nouvelle ligne »).

**Saisie de la désignation** — au focus, la ligne s'étend et révèle :
- une barre de mise en forme (`Aa`),
- l'insertion d'**image**,
- une action **IA** (icône éclair) sur la désignation **[comportement exact à confirmer — sans effet visible sur le compte d'essai]**,
- l'**enregistrement dans la bibliothèque** (icône dossier +),
- l'étiquette de nature cliquable (« Fourniture ✎ ») → modale *Options avancées* : Type d'élément, Compte de produit,
- un **sélecteur de source** en 4 onglets : `Suggestions` · `Bibliothèque` · `CostLib` · `Batiprix`.

**Menu contextuel de ligne** (`⋮`) : *Ajouter une remise* · *Ajuster les prix* · *Rendre optionnel* · *Forcer le N° de ligne* · *Insérer une ligne avant* · *Insérer une ligne après* · *Dupliquer la ligne* · *Supprimer*.
*Ajuster les prix* ouvre un pop-over à deux onglets — **Ajuster le prix de vente** / **Ajuster le prix d'achat** — avec −/+ , pourcentage et bouton Appliquer.

**Menu contextuel de section** (`⋮`) : *Rendre optionnelle* · *Forcer le N° de ligne* · *Modifier le taux de TVA de la section* · *Insérer une ligne* · *Dupliquer la section* · *Supprimer la section*.

**Numérotation automatique** — proposée par une modale pédagogique à la première création de section (« Numérotez automatiquement votre document », aperçu avant/après, *Activer la numérotation* / *Ne plus afficher ce message*). Correspond à l'option « Afficher la numérotation des lignes ».

### 5.4 Bloc conditions (colonne gauche du pied)

- **Acomptes** — « Aucun acompte / + Ajouter » → modale *Modifier les acomptes* : lignes {montant, % ou €, déclencheur}, ajout multiple, suppression.
- **Retenue de garantie** — « + Ajouter » → champ % (défaut 5) + *Montant estimé* calculé, suppression.
- **Moyens de paiement** — cases à cocher : Virement bancaire (+ « Configurer les comptes bancaires »), Chèque (+ « Renseigner l'ordre »), Espèces, Carte bancaire, Financement, Prélèvement, Lettre de change relevé (LCR).
- **Conditions de paiement** — bloc de texte libre, ajoutable/supprimable, pré-rempli depuis les réglages société.

### 5.5 Bloc totaux (colonne droite du pied)

Total HT → `+ Remise globale` → `± Ajustements HT` → TVA par taux → Total TTC → `± Ajustements sur Net à payer` → **Net à payer** → `+ Ajouter une mention de TVA`.

### 5.6 Bloc « Rentabilité prévue »

Apparaît dès qu'une ligne existe. Actions : *Désactiver* · *Vue simplifiée / Vue détaillée* · *Outils*.

**Vue détaillée** : anneau « Marge nette » + légende (Main d'œuvre, Fourniture, Frais généraux, Marge nette) et tableau :
`CATÉGORIE · QUANTITÉ · PRIX DE VENTE · DÉBOURSÉ · MARGE · FRAIS GÉN. · COÛT DE REVIENT · MARGE NETTE`
Deux onglets de regroupement — **Catégories** / **Comptes de produit** — et trois bascules : **% / Coef.**, **Achats / Ventes**.

**Outils** : trois onglets — *Ajuster la marge*, *Ajuster les prix d'achat*, *Ajuster les prix de vente* — avec un pourcentage et une portée : `sur toutes les lignes` · `sur les fournitures` · `sur la main d'œuvre` · `sur les matériels` · `sur la sous-traitance`. Mention : « La marge sera appliquée aux lignes ayant un prix d'achat. »

### 5.7 Menu `Options` — Paramètres et options

Deux onglets. Le premier, **Options du document**, propose pour chaque option une portée **Éditeur** et une portée **Document** (ce qui est visible en saisie ≠ ce qui est imprimé) — point de conception important à répliquer.

*Lignes et colonnes* : Afficher la numérotation des lignes · Afficher les références des produits · Toujours afficher la colonne de TVA · Afficher le total TTC par ligne · Afficher le sous-total des sections · Masquer les détails des ouvrages (+ Afficher le prix des éléments de l'ouvrage · Afficher la quantité des éléments de l'ouvrage) · Grouper unité et quantité dans une seule colonne · Masquer le numéro de révision des devis.

*Éléments du document* : Afficher le tableau de détail de la TVA · Afficher le résumé des sections · Afficher le bloc de signature de l'entreprise · Afficher le nom du chantier · Afficher le responsable · Désactiver l'affichage du QR Code.

*Méthode d'arrondi de TVA* : Somme des arrondis par ligne | Arrondi de la somme des lignes.

Bouton **« Définir comme valeurs par défaut »** — propage la configuration du document vers les réglages société.

Le second onglet, **Paramètres de l'éditeur** (miroir de Réglages › Documents › Éditeur) : Unité par défaut · Type de produit par défaut · Enregistrement auto. des nouveaux produits dans la bibliothèque · Activer le calcul des marges · Désactiver les mentions de TVA automatiques (⚠ signalé comme risqué).

### 5.8 Menu `Outils`

*Activer l'auto-liquidation de la TVA* · *Modifier le taux de TVA du document* · *Importer des lignes d'un document* · *Mettre à jour depuis la bibliothèque* · **Convertir en…** : *Bon de commande fournisseur*, *Demande de prix*.

### 5.9 Menu `Apparence` — bascule en mode aperçu

Ouvre le rendu du document avec un panneau latéral *Apparence du document* :
- **Logo** (png/jpg/gif) et masquage sélectif des informations société : nom, slogan/activité, adresse, téléphone, email, site internet, SIREN/SIRET, n° de TVA
- **Couleur principale** : 8 teintes + couleur personnalisée
- **Police** : Arial, Arial Narrow, Noto Sans, Open Sans, Roboto, Poppins, Montserrat, Source Sans Pro — **Taille** : Normale / Grande
- **Style des tableaux** : bordures arrondies · bordures horizontales · bordures verticales · sections/lignes contrastées · sous-totaux dans les titres de sections
- **Images** : emplacement par défaut (au-dessus / sous / à gauche du texte) · taille par défaut (petites, moyennes, grandes, très grandes, taille originale)
- **Labels & certifications** : gestion des labels affichés (RGE, Qualibat…)
- **Client** : afficher le SIREN/SIRET · le téléphone · l'email
- **Options supplémentaires** : masquer le logo Costructor · mode « Enveloppes à fenêtre » · inverser le client et l'adresse du chantier · marquer « Offert » les lignes dont le prix unitaire est à 0

En mode aperçu, la barre d'outils change : `Pièces jointes` · `Outils` · `Apparence` · `Options` · `Imprimer` · `Envoyer` · `Aide`, avec un bouton *Revenir à l'éditeur*.

### 5.10 Pièces jointes

« Attacher des documents supplémentaires » — compteur dans la barre d'outils. Des pièces jointes partagées par défaut (max. 3, PDF/JPG/PNG ≤ 6 Mo) sont configurables au niveau société, plus une **page de garde**.

### 5.11 Options complémentaires (pied de page de l'éditeur)

*Nom interne* · *Responsable* · *Notes* — les trois explicitement marqués « Ne sera pas affiché au client ». Plus *Notes de bas de page* (affichées, elles).

---

## 6. Écran 3 — Fiche devis finalisé

En-tête : `Devis nº D202600001` · montant TTC · badge de statut · date d'émission · **compte à rebours de validité** · indicateur `N Révision(s)` cliquable.

Corps : bloc Client / Adresse de facturation, tableau des lignes en lecture seule, bloc totaux, bloc Rentabilité prévue.

**Colonne d'actions (droite)** — l'action primaire change selon le statut (`Envoyer` en attente, `Facturer` une fois accepté) :

| Bouton | Menu déroulant |
|---|---|
| `Envoyer` | Télécharger le PDF · Copier le lien de partage · Partager · Marquer comme envoyé |
| `Marquer comme accepté` | Marquer comme refusé · Faire signer sur place · Activer la signature électronique |
| `Facturer` | — |
| `Modifier` | — (ouvre une révision) |
| `Convertir en…` | **Planning de chantier** *(indisponible sur l'offre d'essai)* · **Ventes** : Bon de commande, Bon d'intervention, Bon de livraison · **Achats** : Bon de commande fournisseur, Demande de prix fournisseur · **Modèle de devis** |
| `Plus d'actions` | Associer à un chantier · Assigner un responsable · Ajouter un nom interne · Ajouter num. bon de commande · **Marquer comme…** Facturé / Accepté / Refusé / Annulé · Dupliquer · Archiver · Exporter · Supprimer |

**Panneaux latéraux** : *Documents* (le PDF du devis, avec aperçu / téléchargement / impression ; `+ Créer` → **Bordereau de chantier**) · *Pièces jointes* · *Notes* · *Événements*.

### 6.1 Envoi par email

Modale « Envoyer le devis nº … » :
- **Destinataires** (multi, « + Ajouter un destinataire »)
- Bascule **Recevoir une copie**
- **Modèle** : `Envoi` / `Relance` / `Modèle personnalisé` *(Premium)*
- **Objet** éditable + **corps** en texte riche, avec bouton d'action « Consulter mon document » intégré
- *Options avancées* → **Joindre le PDF à l'email**
- Actions : Annuler / **Envoyer le devis**

### 6.2 Partage par lien

Modale « Partager un document » : lien sécurisé `https://client.costructor.co/d/cpy_<id>/<token>`, bouton copier, **QR code**, mention « partagez-le via WhatsApp et SMS ». Le même QR code est imprimé sur le PDF (désactivable) avec la mention « Scannez le code QR pour retrouver votre devis en ligne. »

### 6.3 Portail client

Page publique responsive : bandeau `Devis nº … — Par <entreprise>`, actions `Imprimer` + `Télécharger`, rendu fidèle du document. Les actions d'acceptation/signature apparaissent selon le statut et l'activation de la signature électronique **[à confirmer — le devis testé était déjà accepté]**.

### 6.4 Signature électronique *(non disponible en essai)*

Argumentaire produit : signature certifiée, conforme **RGPD** et **eIDAS**, intégrée à Costructor ; le client reçoit son devis et le signe en ligne ; l'entreprise reçoit une notification et le **PDF authentifié est lié au devis**. Activable au niveau société (Paramètres des devis) ou document par document (au moment de la finalisation, ou depuis la fiche).

Alternative hors ligne : **« Faire signer sur place »**.

### 6.5 Facturation

Modale « Facturer le devis nº … » présentant un fil d'exécution :

```
✔ Devis de 1 800,00 €                     [Accepté]
│  ┌──────────────────────────────┐
├──│ Créer une facture d'acompte  │
│  └──────────────────────────────┘
│  ┌──────────────────────────────────┐
├──│ Créer la facture de situation #1 │
│  └──────────────────────────────────┘
└─────────────────►  [ Créer la facture finale ]
```

Trois modes : **facture d'acompte**, **factures de situation** (numérotées, incrémentales — logique d'avancement de chantier), **facture finale / de solde**. À répliquer avec soin : c'est le cœur de la facturation BTP.

### 6.6 Mentions de TVA

S�lecteur *Modifier la mention de TVA* : Aucune mention · **TVA non applicable, art. 293 B du CGI** · Régime particulier — Biens d'occasion (art. 297 A du CGI et directive 2006/112/CE) · Régime particulier — Objets d'art · Régime particulier — Objets de collection ou d'antiquité · Régime particulier — Agences de voyage.

---

## 7. Écran 4 — Devis par IA

Modale conversationnelle : « Bonjour <prénom>, quel devis souhaitez-vous créer aujourd'hui ? »

- Zone de saisie libre + **pièce jointe** + **dictée vocale** + **mode vocal**
- Suggestions rapides : *Rénovation salle de bain*, *Ballon d'eau chaude HS*, *Appartement de 65 m²*, *Aménagement local commercial*, *Gros œuvre*
- Panneau d'aide latéral expliquant comment décrire un chantier (type de travaux, surfaces, quantités, matériaux, contraintes d'accès et de dépose)
- **Étapes de génération affichées** : Analyse de votre demande → Sélection des prestations adaptées → Mise en forme → Vérification des données → Création du devis
- Durée observée : ~25–30 s
- Résultat : un **brouillon complet et ouvert dans l'éditeur** — sections métier, lignes chiffrées, **ouvrages détaillés décomposés** (fourniture + main-d'œuvre + consommables), prix d'achat renseignés, marges calculées, TVA à 20 %
- **Boucle de feedback** : NPS 0–10 « Que pensez-vous de ce devis généré par IA ? » avec un identifiant de génération dans l'URL (`?nps=aiquote_…`)

**Exemple réel** — description d'une salle de bain de 6 m² en une phrase → devis de **8 386,28 € HT / 10 063,54 € TTC**, 5 sections (*Travaux préparatoires et dépose*, *Plomberie et sanitaires*, *Revêtements*, *Électricité*, *Peinture et finitions*), ~25 lignes dont 8 ouvrages détaillés, avec quantités cohérentes (7 m² de carrelage sol pour 6 m² posés → chute de ~15 %, 16,5 m² de faïence pour 15 m² posés).

**Limite constatée** : les prix d'achat ne sont renseignés que sur les ouvrages composés ; les lignes forfaitaires sortent à PA = 0, ce qui fausse violemment la rentabilité affichée (marge nette de **371 %** sur le devis généré). Un rebuild doit soit renseigner un PA sur toutes les lignes, soit exclure du calcul les lignes sans PA.

---

## 8. Paramétrage (Réglages)

### 8.1 Réglages › Ventes › Devis — « Paramètres des devis »

> *Ces paramètres seront appliqués à tous les nouveaux devis.*

| Paramètre | Détail |
|---|---|
| **Numérotation** | Préfixe personnalisé (`D`) · Préfixe temporel (`2026`) · Séparateur · Longueur · Numéro séquentiel · Aperçu du prochain numéro · Bascule **Remettre à 0 au 01 janvier**. **Verrouillé** après la première finalisation |
| **Nom des documents PDF** | Modèle de nommage des fichiers |
| **Apparence par défaut** | Par défaut / **Premium** (thèmes) |
| **Acomptes par défaut** | Échéancier pré-rempli |
| **Date d'expiration par défaut** | N jours après la date d'émission (défaut 30) |
| **Date de début des travaux** | Activer par défaut |
| **Durée des travaux estimée** | Activer par défaut + valeur en jours |
| **Texte de signature du client** | Défaut : « Mention "Bon pour Accord", date et signature » |
| **Filigrane sur les brouillons** | Défaut : « Brouillon » |
| **Conditions de paiement par défaut** | Texte riche |
| **Notes de bas de page par défaut** | Texte riche (« texte informatif ou juridique ») |
| **Page de garde** | Fichier joint en première page |
| **Pièces jointes partagées par défaut** | Max. 3, PDF/JPG/PNG ≤ 6 Mo, depuis l'ordinateur ou l'espace fichiers |
| **Signature électronique** | Activation globale |

### 8.2 Réglages › Comptabilité › Rentabilité

Taux de marge par défaut (%) · « Ajuster par type d'élément » · **Coefficient de frais généraux** (%) — avec une note pédagogique : « assurances, téléphonie, électricité, petit outillage… ainsi que les charges de salariés improductifs. Généralement estimés à 25 %. »

Ce coefficient alimente les colonnes *Frais gén.*, *Coût de revient* et *Marge nette* du bloc rentabilité.

### 8.3 Réglages › Documents › Éditeur

Unité par défaut · Type de produit par défaut · Enregistrement auto. des nouveaux produits dans la bibliothèque · Activer le calcul des marges.

### 8.4 Réglages › Documents › Emails

- **Modèles** — dont *Nouveau devis* et *Relance de devis en attente* (17 modèles au total sur l'ensemble des documents). Modèles personnalisés réservés au Premium.
- **Automatisations** — *Activer la relance automatique des devis* · relance des factures impayées · demande d'avis client · réclamation automatique des retenues de garantie.
- **Réglages avancés**.

### 8.5 Autres réglages en interaction

Apparence · Pieds de page · TVA · Catégories · Tags analytiques · Plan comptable · CGV · Bibliothèque · Facturation électronique.

---

## 9. Bibliothèque de prix (dépendance directe)

Module `Ventes › Bibliothèque` (`/products`) : arborescence de **dossiers** + catalogue à onglets — `Tous` · `Fournitures` · `Matériels` · `Ouvrages` · `Mains-d'œuvre` · `Sous-traitances` · `Divers` · `Textes`. Recherche, filtres `Fournisseur` et `Stock`, `Nouvel élément`, `Exporter`, `Importer`, réglages.

Un **plugin Chrome** permet d'importer « plus de 10 millions de produits en 1 clic » depuis les sites de distributeurs.

Trois sources de prix alimentent les lignes de devis :

| Source | Nature | Statut sur le compte |
|---|---|---|
| **Bibliothèque** | Catalogue propre à l'entreprise | Vide |
| **CostLib** | Base d'ouvrages **collaborative et gratuite**, enrichie par la communauté | Adhésion requise |
| **Batiprix** | Base d'ouvrages du marché, **> 28 000 ouvrages**, mise à jour mensuelle | Abonnement payant |

Le sélecteur de ligne propose aussi un onglet **Suggestions** (moteur de recommandation, contenu non observé).

---

## 10. Interfaces sortantes

| Cible | Déclencheur | Nature |
|---|---|---|
| **Facture** (acompte / situation #n / finale) | `Facturer` | Conversion partielle et répétée — relation 1..n |
| **Bon de commande client** | `Convertir en…` | Copie des lignes |
| **Bon d'intervention** | `Convertir en…` | Copie des lignes |
| **Bon de livraison** | `Convertir en…` | Copie des lignes |
| **Bon de commande fournisseur** | `Convertir en…` / menu `Outils` | Extraction des fournitures / sous-traitance |
| **Demande de prix fournisseur** | `Convertir en…` / menu `Outils` | Consultation achat |
| **Modèle de devis** | `Convertir en…` | Capitalisation |
| **Bordereau de chantier** | Panneau *Documents* → `+ Créer` | Document d'exécution |
| **Planning de chantier** | `Convertir en…` | Indisponible sur l'offre testée |
| **Chantier** | `Associer à un chantier` | Rattachement, pas conversion |

---

## 11. User stories et critères d'acceptation

### Epic A — Rédaction du devis

**US-A1 — Créer un devis vierge**
*En tant que* chargé d'affaires, *je veux* créer un devis vide *afin de* commencer un chiffrage.
- [ ] Le devis est créé en statut `Brouillon`, sans numéro, avec date d'émission = aujourd'hui et date d'expiration = aujourd'hui + N jours (N = réglage société).
- [ ] Les valeurs par défaut société sont appliquées : moyens de paiement, conditions de paiement, notes de bas de page, acomptes, apparence, options d'affichage.
- [ ] Le devis apparaît immédiatement dans l'onglet `Brouillons` avec le libellé « Brouillon » en lieu et place du numéro.

**US-A2 — Structurer le document**
*En tant que* chargé d'affaires, *je veux* organiser mon devis en sections et sous-sections *afin de* rendre le chiffrage lisible par le client.
- [ ] Je peux insérer : ligne, section, sous-section (dans une section), texte, saut de ligne, saut de page.
- [ ] Je peux réordonner par glisser-déposer et par flèches ↑/↓, y compris déplacer une ligne d'une section à l'autre.
- [ ] Une section affiche son sous-total et se replie/déplie.
- [ ] La numérotation automatique hiérarchique (1, 1.1, 1.2, 2…) est activable et se recalcule à chaque réorganisation.
- [ ] Un numéro peut être forcé manuellement sur une ligne ou une section.

**US-A3 — Chiffrer une ligne**
- [ ] Je choisis la nature de la ligne : fourniture, main-d'œuvre, ouvrage détaillé, matériel, sous-traitance.
- [ ] Je saisis quantité, unité (liste de ~40 unités), prix unitaire HT, taux de TVA.
- [ ] Le total HT de ligne se recalcule en temps réel.
- [ ] Je peux ajouter une remise de ligne en % ou en € HT ; la colonne REMISE n'apparaît que si au moins une remise existe.
- [ ] Je peux rendre une ligne optionnelle : elle est exclue de tous les totaux et signalée comme telle sur le PDF.

**US-A4 — Composer un ouvrage détaillé**
*En tant que* chargé d'affaires, *je veux* décomposer un ouvrage en fournitures, main-d'œuvre et consommables *afin de* fiabiliser mon déboursé.
- [ ] Le prix d'achat de l'ouvrage est la somme des `quantité × PA unitaire` de ses éléments.
- [ ] Le prix de vente se déduit d'un taux de marge brute, ou peut être saisi manuellement (bascule dédiée).
- [ ] Je peux ajuster la marge élément par élément.
- [ ] Une barre de répartition montre Main d'œuvre / Fourniture / Frais généraux / Marge nette avec les montants.
- [ ] Le niveau de détail visible par le client est contrôlé par les options de document (masquer les détails, masquer les prix, masquer les quantités).

**US-A5 — Réutiliser un prix existant**
- [ ] Depuis la désignation, je peux chercher dans ma bibliothèque, dans CostLib et dans Batiprix.
- [ ] L'insertion reprend désignation, unité, prix d'achat, prix de vente et, pour un ouvrage, sa composition.
- [ ] Un nouveau produit saisi à la volée peut être enregistré dans la bibliothèque (manuellement, ou automatiquement si le réglage est actif).
- [ ] « Mettre à jour depuis la bibliothèque » resynchronise les prix des lignes du devis.

**US-A6 — Importer un chiffrage existant**
- [ ] J'importe un devis / DPGF / DQE au format Excel ou CSV et retrouve la structure en sections et lignes.
- [ ] J'importe un devis au format PDF.
- [ ] J'importe les lignes d'un autre document Costructor.

### Epic B — Piloter la marge

**US-B1 — Voir ma rentabilité en temps réel**
- [ ] Le bloc *Rentabilité prévue* s'affiche dès qu'une ligne existe et se met à jour à chaque modification.
- [ ] Je bascule entre vue simplifiée et vue détaillée, entre regroupement par catégorie et par compte de produit, entre affichage en % et en coefficient, entre base achats et base ventes.
- [ ] Les frais généraux sont appliqués selon le coefficient société et distingués du déboursé.
- [ ] **Correctif attendu par rapport à l'existant** : les lignes sans prix d'achat sont exclues du calcul de marge (ou signalées), au lieu d'être comptées comme 100 % de marge.

**US-B2 — Ajuster ma marge en masse**
- [ ] J'applique un pourcentage de marge, de prix d'achat ou de prix de vente sur toutes les lignes ou sur une nature de ligne (fournitures, main-d'œuvre, matériels, sous-traitance).
- [ ] Les lignes dont le prix est verrouillé (cadenas) ne sont pas modifiées.
- [ ] L'opération est annulable (undo).

### Epic C — Finaliser et diffuser

**US-C1 — Finaliser**
- [ ] Un écran de contrôle récapitule numéro, dates, client et net à payer, distingue les **erreurs bloquantes** (client manquant) des **recommandations** non bloquantes.
- [ ] La signature électronique est activable à ce moment-là.
- [ ] Trois issues : Annuler / Enregistrer en brouillon / Finaliser.
- [ ] À la finalisation, le numéro est attribué depuis la séquence, le statut passe `En attente`, le filigrane « Brouillon » disparaît, un événement est journalisé.
- [ ] Un écran de rebond propose : Envoyer par email · Partager le lien · Télécharger le PDF · Facturer.

**US-C2 — Envoyer au client**
- [ ] Je choisis un ou plusieurs destinataires, un modèle (Envoi / Relance / personnalisé), j'édite objet et corps.
- [ ] Je peux recevoir une copie et joindre le PDF.
- [ ] L'envoi bascule le statut en `Envoyé` et journalise l'événement.
- [ ] Une relance automatique des devis en attente est activable au niveau société.

**US-C3 — Partager sans email**
- [ ] Je copie un lien sécurisé ou je présente un QR code.
- [ ] Le lien ouvre une page publique responsive permettant de consulter, imprimer et télécharger le devis.
- [ ] Le QR code est imprimé sur le PDF, désactivable par option.

**US-C4 — Faire signer**
- [ ] Signature électronique en ligne, conforme eIDAS et RGPD, avec notification à l'entreprise et PDF authentifié rattaché au devis.
- [ ] Alternative « Faire signer sur place ».
- [ ] La signature fait passer le devis en `Accepté`.

### Epic D — Suivre et transformer

**US-D1 — Suivre mon portefeuille**
- [ ] Les onglets affichent à la fois un compte et un montant cumulé.
- [ ] Je filtre par statut (multi), client, chantier, responsable et période d'émission (7 raccourcis + plage libre).
- [ ] Je choisis les colonnes visibles : montants HT, net à payer, responsable, reste à facturer.
- [ ] J'exporte en CSV ou XLSX sur une période, avec ou sans les PDF.

**US-D2 — Réviser un devis finalisé**
- [ ] Modifier un devis finalisé ouvre une **révision** clairement identifiée dans l'interface.
- [ ] À la re-finalisation, le numéro est conservé et le compteur de révisions s'incrémente.
- [ ] L'historique des révisions permet d'aperçu, télécharger, imprimer, **restaurer** et dupliquer chaque version.
- [ ] **Règle à trancher** : une révision replace le devis en `En attente`. Le comportement attendu doit être explicité pour un devis déjà `Facturé` (proposition : interdire la révision, forcer un avoir ou un devis complémentaire).

**US-D3 — Transformer en facture**
- [ ] Depuis un devis accepté : facture d'acompte, facture de situation #n, facture finale.
- [ ] Facturer un devis `En attente` le bascule automatiquement en `Accepté`, après confirmation explicite.
- [ ] Le reste à facturer est traçable (colonne dédiée dans la liste).

**US-D4 — Alimenter la chaîne documentaire**
- [ ] Conversion vers bon de commande, bon d'intervention, bon de livraison, bon de commande fournisseur, demande de prix, modèle de devis, bordereau de chantier.
- [ ] Rattachement à un chantier, avec ou sans conversion.

### Epic E — Générer par IA

**US-E1 — Générer un devis à partir d'une description**
- [ ] Je décris le chantier en texte libre, par la voix, ou en joignant un document ; des suggestions amorcent la saisie.
- [ ] La progression est affichée par étapes explicites.
- [ ] Le résultat est un **brouillon éditable** structuré en sections, avec quantités cohérentes (chutes incluses) et ouvrages décomposés.
- [ ] Un retour NPS est collecté, rattaché à l'identifiant de génération.
- [ ] **Exigence de qualité** : tout ouvrage généré porte un prix d'achat ; à défaut, la ligne est signalée comme « à chiffrer » plutôt que de fausser la marge.

---

## 12. Enseignements de conception à retenir pour le rebuild

1. **La double portée Éditeur / Document.** Chaque option d'affichage se règle indépendamment pour la saisie et pour le PDF. C'est ce qui permet au chargé d'affaires de travailler avec toutes les colonnes de marge sous les yeux tout en envoyant un document épuré. À copier tel quel.
2. **Les valeurs par défaut sont bidirectionnelles.** Les réglages société pré-remplissent le document, et le document peut repousser sa configuration vers les réglages (« Définir comme valeurs par défaut »). Ce raccourci évite d'aller dans les réglages.
3. **Le numéro n'existe qu'à la finalisation**, et la séquence se verrouille dès la première émission. C'est une contrainte de conformité (intégrité de la numérotation), pas un détail d'implémentation.
4. **La révision plutôt que l'édition.** Aucun document finalisé n'est modifié en place : chaque modification crée une version restaurable. Conception indispensable en environnement contractuel.
5. **L'ouvrage composé est l'unité de valeur.** C'est lui qui porte le déboursé, la marge et la réutilisabilité. Un modèle de données qui ne gère que des lignes plates ne tiendra pas.
6. **Frais généraux ≠ déboursé.** La chaîne Déboursé → Frais généraux → Coût de revient → Marge nette est le vocabulaire attendu par le métier ; ne pas la réduire à « coût / marge ».
7. **Le rebond après chaque étape.** Finalisation et acceptation ouvrent une modale de rebond proposant les 2 à 4 actions suivantes les plus probables. Faible coût, fort effet sur l'adoption.
8. **Trois sources de prix cohabitent** (bibliothèque propre, base collaborative gratuite, base commerciale payante) derrière une seule interface de recherche à onglets. Le modèle économique repose en partie sur cette architecture.

---

## 13. Zones d'ombre à lever avant chiffrage

| # | Sujet | Pourquoi c'est important |
|---|---|---|
| 1 | **Action IA sur la désignation** (icône éclair) — sans effet observable sur le compte d'essai | Périmètre fonctionnel de l'assistance à la rédaction |
| 2 | **Onglet « Suggestions »** du sélecteur de prix — moteur de recommandation non observé (bibliothèque vide) | Peut être un simple historique ou un vrai moteur |
| 3 | **Bascule vers l'onglet « Perdus »** — automatique à l'expiration ou manuelle ? | Règle de gestion des statuts |
| 4 | **Révision d'un devis facturé** — comportement non testé | Risque de corruption de la chaîne comptable |
| 5 | **Comportement du portail client** avant acceptation (boutons Accepter / Refuser / Signer) | Cœur du parcours client |
| 6 | **Import PDF** — extraction automatique de lignes ou simple pièce jointe ? | Écart d'effort considérable |
| 7 | **Multitaux / Intracom. / Extracom.** dans le sélecteur de TVA — comportements de calcul non observés | Conformité fiscale |
| 8 | **Labels & certifications** — source des labels (RGE, Qualibat…) et rendu sur le PDF | Argument commercial sur le marché de la rénovation |
| 9 | **Modèles de devis** — portée exacte (structure seule, ou structure + prix + conditions ?) | Capitalisation commerciale |
| 10 | **Bordereau de chantier** et **Planning de chantier** — contenus non observés | Interface avec le module Chantiers |

---

## 14. Annexe — traces de l'analyse

- Devis de test créé, finalisé, accepté puis révisé : **D202600001** (`quote_01m2azs1dfxjz8k9cv8eb6cr9`) — 1 800,00 € TTC, client « ZZ Test Claude (a supprimer) », 1 révision.
- Devis généré par IA : **D202600002** (`quote_01m2dj2x4mt39cde5katz5b5fs`) — 10 063,54 € TTC, brouillon.
- Contact de test créé : **ZZ Test Claude (a supprimer)**.

> Ces trois objets sont à supprimer du compte après relecture de la spécification.
