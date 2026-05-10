# Le Bissap Artisanal — Gestion Société

Application web sur mesure pour **Le Bissap Artisanal** (Emmanuel Mbotifeno,
Le Port, La Réunion) — gestion intégrée d'une entreprise artisanale de
production de boissons.

**Catalogue** : 2 gammes — **Bissapa** (8 saveurs en bouteilles 25cl) et
**Zandjabila** (2 GingerShot en flacons 60ml). Extensible via le module Admin.

**Fonctionnalités principales** :
- Production : saisie de lots avec date « à consommer de préférence avant
  le » (DDM), **traçabilité ingrédients** (fleur de bissap, sucre, arôme +
  ingrédients naturels selon la saveur), gestion des pertes (casse,
  péremption)
- Stock : vue temps réel par produit (produite / livrée / perdue / disponible),
  alertes sous seuil, FIFO automatique sur la date à consommer avant
- Clients B2B : annuaire, tarifs personnalisés par produit
- Livraisons : création, **heure prévue optionnelle** (créneau précis type
  « 14h chez Carrefour »), tournée du jour triée par heure assignée au
  livreur, statuts, édition des métadonnées tant que la livraison est
  prévue
- Facturation : génération automatique à la livraison, numérotation séquentielle
  `FAC-YYYY-NNNNN`, mentions légales art. 293 B CGI, état de règlement
  affiché dans le PDF (acquittée / partiel / reste à payer)
- **Système de consigne** : crédit configurable par bouteille / flacon
  rendu vide (0,05 € par défaut), saisi au moment de marquer la livraison
  livrée et automatiquement déduit du montant à payer sur la facture
- PDF : Bon de livraison + Facture avec logo Bissapa intégré (templates
  react-pdf)
- Email transactionnel : envoi automatique de la facture au client (Resend)
- Paiements : multi-modes (espèces, virement, chèque, carte), multi-dates
  (chèques post-datés gérés comme paiements promis)
- Finance : saisie dépenses avec photo justificatif, **enveloppes
  budgétaires** (réinvestissement / charges / personnel) et **paiements
  multi-échéances** (échéances prévues + règlements effectifs, dette
  fournisseur ouverte sans date possible)
- Dashboard : KPIs CA / Décaissements / Résultat, **vue enveloppes**
  alloué × consommé × solde, graphique 12 mois, top 5 clients & produits
- Export comptable CSV mensuel : factures, encaissements, dépenses
  engagées et décaissements effectifs (cash flow réel)
- Admin : utilisateurs, catalogue produits, **paramètres globaux** (tarif
  consigne), réinitialisation des données opérationnelles (mode démo)

**Quatre rôles** :
- **Patron** : accès complet, finance complète (3 enveloppes), paramètres,
  gestion utilisateurs, suppressions définitives
- **Adjoint** (« Patron par intérim ») : opérationnel complet + dashboard
  (sans l'enveloppe Personnel) + finance limitée (Réinvestissement +
  Charges, jamais Personnel). Ne peut ni promouvoir vers Patron ni
  supprimer définitivement (annulations uniquement)
- **Production** : lots, stock, livraisons, lecture clients
- **Livreur / Vendeur / Commercial** : tournées, livraisons, encaissements,
  création client sur le terrain

## Stack technique

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS v4**
- **shadcn/ui** (composants accessibles, base UI library)
- **Supabase** : PostgreSQL, Auth (email + mot de passe), Storage (bucket
  `justificatifs` privé), RLS granulaire par rôle
- **@react-pdf/renderer** : bons de livraison et factures
- **Resend** : envoi transactionnel des factures par email avec PDF en pièce jointe
- **Zod** : validation des schémas (forms et server actions)
- **Recharts** : graphiques du tableau de bord finance
- **next-themes maison** : dark mode (clair / sombre / système)
- **Vitest** : tests unitaires sur la logique métier (FIFO, répartition,
  calculs stock)
- Hébergement : **Netlify** (frontend) + **Supabase** (backend)

## Prérequis

- Node.js 20+ (recommandé : 22 LTS)
- npm 10+
- Un projet Supabase (région UE pour RGPD)
- Un compte Netlify pour le déploiement
- Un compte Resend pour l'envoi des factures par email (optionnel — l'app
  fonctionne sans, juste pas d'email envoyé)

## Installation

```bash
npm install
cp .env.local.example .env.local
# Renseigner les clés Supabase (et optionnellement Resend) dans .env.local
npm run dev
```

L'application est disponible sur http://localhost:3000.

### Variables d'environnement requises

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (PostgREST + Auth client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (server only, **jamais** exposée au browser) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (dev : `http://localhost:3000`, prod : `https://gestion-bissap-artisanal.blowdok.fr`) |

### Variables optionnelles

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Clé API Resend pour l'envoi des factures par email |
| `RESEND_FROM` | Adresse expéditeur (ex: `Le Bissap Artisanal <facture@xxx>`) |
| `NEXT_PUBLIC_ENTREPRISE_*` | Surcharges des infos entreprise (cf. `lib/config/entreprise.ts`) |

### Initialisation BDD Supabase

Appliquer dans l'ordre les migrations du dossier `supabase/migrations/` via
le SQL Editor du Dashboard Supabase ou via `npx supabase db push` après
`supabase link`.

Deux seeds disponibles selon l'environnement :

| Environnement | Fichier | Contient |
|---|---|---|
| **Production** (chez le Patron) | `supabase/seed-production.sql` | Uniquement les 10 produits |
| **Développement** (local) | `supabase/seed.sql` | 10 produits + 3 clients fictifs + lots/livraisons de test |

Les 3 utilisateurs de test (dev uniquement) sont créés via
`node --env-file=.env.local scripts/seed-users.mjs`.

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarrage du serveur de développement (Turbopack) |
| `npm run build` | Build de production |
| `npm start` | Démarrage en mode production |
| `npm run lint` | Vérification ESLint |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:watch` | Tests unitaires en mode watch |
| `npm run test:e2e` | Tests end-to-end (Playwright) |

## Arborescence

```
app/
  ├── (auth)/                    # Login, reset password
  ├── (app)/                     # Routes protégées (sidebar)
  │   ├── dashboard/             # KPIs Patron + graphiques finance
  │   ├── stock/                 # Vue temps réel + lots + pertes
  │   ├── production/            # Saisie lots avec date « à consommer avant »
  │   ├── clients/               # CRUD + tarifs négociés
  │   ├── livraisons/            # Liste + nouvelle + tournée
  │   ├── factures/              # Liste + détail + encaissements
  │   ├── finance/               # Dépenses + export CSV
  │   └── admin/                 # Utilisateurs + catalogue produits
  └── api/
      ├── pdf/                   # Génération PDF (BL + Facture)
      ├── livraisons/[id]/       # Endpoint envoi facture par email
      └── export/comptable/      # CSV mensuel pour comptable

components/
  ├── ui/                        # shadcn/ui (Button, Card, Dialog…)
  ├── layout/                    # AppShell, sidebar, page-header
  └── theme-*.tsx                # Provider et toggle dark mode

lib/
  ├── supabase/                  # client (browser/server/admin/proxy)
  ├── auth/                      # Rôles, ROLE_HOME, requireRole, formatNomRole
  ├── domain/                    # Logique pure : fifo, repartition, stock
  ├── utils/                     # Formatters EUR, dates fr-FR
  ├── pdf/                       # Templates react-pdf (facture + BL + styles)
  ├── email/                     # Helpers Resend + send-facture
  └── config/                    # Config entreprise (Bissapa)

supabase/
  ├── migrations/                # 16 migrations SQL versionnées
  ├── seed.sql                   # Dev : 10 produits + 3 clients fictifs
  ├── seed-production.sql        # Prod : uniquement les 10 produits
  └── cleanup-test-data.sql      # Purge données opérationnelles si besoin

tests/unit/                      # Tests Vitest (FIFO, répartition, stock)
scripts/                         # Helpers Node.js (seed-users, check-*, etc.)
proxy.ts                         # Refresh session + redirection par rôle
netlify.toml                     # Config déploiement Netlify
```

## Documentation

- Cahier des charges : `Cahier_des_Charges_Application_Gestion_Boissons.docx`
- Devis : `Devis_Application_Gestion_Boissons.docx`
- Plan d'implémentation : voir le plan validé en début de projet

## 📘 Guide finance — Comprendre la gestion des dépenses

> Cette section est écrite pour le Patron de Bissapa. Elle explique en
> langage simple comment fonctionne le module **Finance** et comment
> piloter ton activité avec.

### 1. Les 11 catégories de dépense

Quand tu saisis une dépense, tu choisis une **catégorie**. Voici la liste
et ce qu'on met dedans :

| Catégorie | Ce qu'elle contient |
|---|---|
| **Matière première** | Sucre, fleurs d'hibiscus, fruits (ananas, gingembre, citron, menthe), gaz et eau de production, bouteilles, cartons, étiquettes, affiches, machines |
| **Salaire employé** | Salaires + charges sociales du personnel |
| **Électricité** | Électricité du local (le gaz et l'eau de production restent en *Matière première*) |
| **Cotisation de l'État** | URSSAF, impôts, CFE |
| **Loyer** | Loyer du local |
| **Logiciel facturation** | Abonnements logiciels |
| **Téléphone** | Forfait pro, internet |
| **Transport** | Carburant, réparation du véhicule |
| **Assurance** | RC professionnelle, assurance véhicule, multirisque |
| **Marketing & communication** | Pubs, salons, flyers, réseaux sociaux, communication |
| **Autres** | Tout ce qui ne rentre dans aucune catégorie ci-dessus |

### 2. Les 3 enveloppes 50/30/20

Chaque dépense est rattachée à une **enveloppe** (le « budget » dans
lequel tu prends l'argent). Le Tableau de bord calcule pour chaque mois :
- combien tu **alloues** à chaque enveloppe (en % du résultat du mois),
- combien tu as **consommé**,
- ton **solde** restant (vert = OK, rouge = à découvert).

| Enveloppe | Pourcentage du résultat | À quoi elle sert |
|---|---|---|
| 🟢 **Réinvestissement** | 50 % | Tout ce qui fait tourner la production : matières premières, machines, emballages |
| 🟠 **Charges** | 30 % | Tous les frais récurrents qui ne sont pas de la production : salaires, loyer, électricité, cotisations, transport, assurance, communication, logiciels, téléphone |
| 🔵 **Personnel** | 20 % | Ton enveloppe à toi (Emmanuel) — tes besoins perso et familiaux. Tu peux aussi y piocher pour payer ponctuellement une charge ou un réinvestissement si tu le souhaites |

**Astuce** : quand tu choisis une catégorie, l'enveloppe se remplit
automatiquement avec le bon défaut. Tu peux **toujours la changer**
si tu veux imputer la dépense ailleurs (ex : payer une livraison
bouteilles avec ton enveloppe Personnel).

### 3. Les 4 statuts de paiement

Une fois la dépense créée, son **statut** dépend des paiements que tu
attaches dessus. Tu vois ces statuts colorés dans le tableau Finance :

| Badge | Quand l'utiliser |
|---|---|
| 🔴 **À payer** | La dépense existe mais tu n'as **rien programmé** : pas d'échéance, pas de règlement. C'est une **dette ouverte** sur laquelle tu dois agir. |
| 🔵 **Prévu** | Tu as **planifié une ou plusieurs échéances** futures (date prévue) mais l'argent n'est pas encore parti. Pour anticiper le cash-flow. |
| 🟠 **Partiel** | Tu as déjà payé **une partie** de la dépense, mais il reste un solde à régler. |
| 🟢 **Payée** | Tout est réglé, somme des paiements = montant total. |

### 4. Saisir des paiements multi-échéances

Une dépense peut être réglée en **1 paiement comptant** ou en **plusieurs
échéances** (pour les factures fournisseurs payables en 2-3 fois,
ou les chèques post-datés).

**Trois cas concrets :**

> **Cas 1 — paiement comptant** (achat carburant)
> Tu crées la dépense (Transport, 80 €), puis ajoutes 1 ligne paiement :
> *date effective = aujourd'hui, mode = carte*. Statut → **Payée**.

> **Cas 2 — facture fournisseur en 3 fois** (sucre, 600 €)
> Tu crées la dépense puis ajoutes 3 lignes paiement :
> *200 € prévu le 15/05, 200 € prévu le 15/06, 200 € prévu le 15/07*
> (sans date effective). Statut → **Prévu**.
> Le jour où tu paies réellement la 1ʳᵉ échéance, tu cliques sur le
> bouton ✓ (« Marquer payé ») dans la fiche détail. Statut → **Partiel**.
> Quand les 3 sont marquées payées → **Payée**.

> **Cas 3 — dette ouverte sans plan** (réparation imprévue, 350 €)
> Tu crées la dépense sans aucune ligne paiement. Statut → **À payer**.
> Tu la verras dans le filtre "À payer" tant que tu n'auras pas
> programmé son règlement.

### 5. Lire le Tableau de bord Finance

Sur la page **/finance** :
- **Décaissements du mois** → ce qui a vraiment quitté ton compte ce mois
- **Engagements du mois** (info sous le KPI) → ce que tu as commandé/engagé ce mois (peut être > décaissements si tu paies plus tard)
- **Reste à payer** → solde total de tes dettes ouvertes (À payer + Prévu + Partiel)
- **Échéances dans les 30 j** → les paiements planifiés à venir, avec icône ⚠ si en retard

Sur la page **/dashboard** (Tableau de bord global) :
- **Enveloppes 50/30/20** : 3 cartes colorées avec barre de progression
  - Si la barre est verte/blanche → l'enveloppe a encore du budget
  - Si la barre devient rouge et le solde affiche un montant **négatif** → tu as dépassé l'enveloppe ce mois

### 6. Filtrer la liste des dépenses

Sur **/finance**, deux rangées de boutons au-dessus du tableau :
- **Statut** : Tous · À payer · Partiel · Prévu · Payée
- **Enveloppe** : Toutes · Réinvestissement · Charges · Personnel

Tu peux **combiner** les deux (ex : « À payer » + « Charges » → toutes
les dettes ouvertes en charges fixes). Le compteur de résultats et le
total « Reste à payer » se recalculent automatiquement sur la sélection.

Cliquer sur **Réinitialiser les filtres** (à droite) revient à la vue
complète.

### 7. Export comptable CSV

Le bouton **Export CSV** en haut de `/finance` télécharge un fichier
prêt à envoyer à ton comptable, contenant :
- Toutes les **factures émises** dans le mois (avec montant HT, client, SIRET)
- Tous les **paiements clients encaissés**
- Toutes les **dépenses engagées** (avec catégorie, enveloppe, statut)
- Tous les **décaissements** réels (paiements effectifs sortis du compte)
- Un **résumé du mois** : CA encaissé, décaissements, résultat cash flow

Format : `;` séparateur (Excel France), accents UTF-8 BOM (pas de
caractères cassés à l'ouverture).

## 🔁 Système de consigne

Le Patron applique une consigne sur chaque bouteille / flacon vendu.
Quand un client rapporte ses contenants vides, le crédit est déduit
automatiquement de la facture en cours.

### Configurer le tarif

**Admin → Paramètres** (Patron uniquement). Champ « Tarif par bouteille /
flacon (€) », **0,05 € par défaut**, modifiable à tout moment. Le nouveau
tarif s'applique aux livraisons marquées livrées **après** la modification
(les factures déjà émises gardent le crédit calculé avec l'ancien tarif).

### Saisir la récupération

Au moment de cliquer **« Marquer livrée »** sur une livraison, la modale
de confirmation propose un champ **« Bouteilles / flacons vides récupérés »**
(0 par défaut). Si > 0, le crédit calculé s'affiche en direct
(`5 × 0,05 € = −0,25 €`).

### Effet sur la facture

La facture est générée avec :
- `montant_ht` : total des lignes (inchangé)
- `montant_consigne` : crédit calculé par le trigger Postgres
- `montant_du` = `montant_ht − montant_consigne` (le **net à payer**)

Le **solde** et le **statut de paiement** sont calculés sur `montant_du`
(pas sur `montant_ht`). Une ligne « Consigne récupérée (X bouteilles) »
apparaît :
- Sur la fiche facture
- Sur le PDF (juste après Total TTC)
- Dans le corps de l'email d'envoi de la facture

> **Pas de suivi par client** : on déduit simplement au coup par coup,
> sans tenir un compteur de bouteilles en circulation. Si le besoin
> évolue, ce sera une V2.

## 🗑️ Supprimer ou annuler une donnée

Le règlement français interdit la suppression d'une **facture émise**
(art. 286 du CGI, conservation 10 ans). L'application propose donc deux
mécanismes distincts selon ce que tu veux faire :

### A. Supprimer (irréversible, utilisé pour corriger une erreur de saisie)

Disponible uniquement quand la donnée n'a pas encore généré d'effet
légal ou comptable :

| Donnée | Quand le bouton apparaît |
|---|---|
| **Dépense** | Toujours (Patron) — bouton corbeille sur la liste |
| **Client** | S'il n'a aucune livraison enregistrée — bouton sur la fiche client |
| **Produit** | S'il n'est référencé dans aucun lot ni livraison — menu trois-points |
| **Lot de production** | S'il n'a jamais été consommé (livré ou perdu) — bouton sur la fiche lot |
| **Livraison** | Statut programmée / en cours / annulée et **sans facture** — bouton sur la fiche livraison |

Si la condition n'est pas remplie, le bouton n'apparaît pas (ou est
désactivé avec une infobulle explicative). Pour les clients/produits avec
historique, utilise plutôt **Désactiver** (les données restent en base
mais sortent des listes par défaut).

### B. Annuler (conserve la trace, utilisé pour les factures déjà émises)

| Donnée | Effet |
|---|---|
| **Livraison** programmée/en cours | Statut passe à `Annulée`. Les mouvements de stock générés par cette livraison sont **automatiquement supprimés** (RPC `annuler_livraison`) — la marchandise n'a jamais quitté l'entrepôt, le stock disponible est restauré |
| **Facture** émise | Bouton **Annuler la facture** (Patron) sur la fiche facture. La facture est marquée ANNULÉE (filigrane rouge sur le PDF), exclue du CA et du dashboard, ses paiements sont supprimés (équivalent à un avoir global), la livraison liée passe en `Annulée` (et son stock est restauré). **La facture reste consultable** pour la traçabilité légale |

Une facture annulée n'est plus modifiable et son numéro reste réservé
(la séquence ne se réajuste pas, ce qui est l'usage légal en France).

### C. Tout réinitialiser (transition tests → production)

Page **Admin → Réinitialiser les données opérationnelles** (Patron uniquement,
double confirmation par saisie du mot-clé `RESET`).

Cette action vide en une fois :
- Toutes les **livraisons**, **factures**, **paiements**
- Tous les **lots** et **mouvements de stock**
- Toutes les **dépenses**
- Réinitialise la numérotation à `FAC-AAAA-00001`

Sont **conservés** : utilisateurs, clients, produits, tarifs négociés,
configuration entreprise.

> ⚠️ **À utiliser une seule fois**, pour basculer de la phase de tests
> à la mise en service réelle. Une fois en production, ne pas y
> toucher : tu perdrais l'historique légal. Pour corriger une erreur,
> utilise les actions ciblées ci-dessus.

## État du projet

- ✅ **Phase 0** — Cadrage & bootstrap : scaffolding Next.js 16, shadcn/ui,
  helpers Supabase, logique métier (FIFO, 50/30/20) avec tests
- ✅ **Phase 1** — Auth + Layout + Module Clients + Module Admin
  (utilisateurs, catalogue produits)
- ✅ **Phase 2** — Stock & Production : lots avec date « à consommer avant »
  (DDM), vue stock temps réel, alertes seuil, saisie de pertes, vues SQL
  `stock_par_lot` / `stock_par_produit`, traçabilité des ingrédients
  (table `lot_ingredients` + vue `lots_par_ingredient`)
- ✅ **Phase 3** — Livraisons & Facturation : trigger FIFO, facture auto,
  numérotation séquentielle, génération PDF (BL + Facture), envoi email Resend,
  multi-paiements avec dates (chèques post-datés)
- ✅ **Phase 4** — Finance & Dashboard : dépenses avec justificatif Storage,
  KPIs CA/Dépenses/Marge, répartition 50/30/20, graphique 12 mois, top 5
  clients & produits, export CSV comptable
- ✅ **Phase 5** — Annulations & corrections : suppression ciblée par entité
  (livraisons brouillon, lots non consommés, etc.), annulation de facture
  avec filigrane PDF, restauration automatique du stock à l'annulation
  d'une livraison, mode reset complet (Patron, double confirm)
- ✅ **Phase 6** — Affinage rôle Adjoint : « Patron par intérim » avec accès
  Dashboard (sans enveloppe Personnel) + Finance limitée (Réinvestissement
  + Charges), promotion vers Patron bloquée, policies RLS étendues sur
  livraisons/factures/dépenses (migrations 0026 et 0027)
- ✅ **Phase 7** — Système de consigne : tarif configurable depuis
  Admin → Paramètres (table `parametres_entreprise` singleton), saisie au
  moment de marquer livrée, déduction automatique sur la facture (PDF +
  fiche + email), `montant_du = montant_ht − montant_consigne` dans la
  vue `factures_avec_solde`
- ✅ **Phase 7bis** — Heure prévue de livraison optionnelle (colonne
  `livraisons.heure_prevue time` nullable) : champ dans le formulaire de
  création/édition, affichage sur la fiche, badge bleu HH:MM sur les
  cartes de tournée, tri par heure ascendant (sans-créneau en fin), heure
  ajoutée sur le PDF Bon de livraison. **Pas sur la facture** : la DDM
  reste sur l'étiquette des bouteilles, le numéro de lot suffit pour la
  traçabilité B2B
- ✅ **Bonus** — Dark mode, badges colorés, sidebar sticky avec scroll
  interne, suffixe `(adj)` sur les Adjoints, logo Bissapa intégré aux
  PDFs, favicon hibiscus, branding « Le Bissap Artisanal · Gestion
  Société », libellé réglementaire « À consommer de préférence avant le »
  (DDM) à la place de l'ancien « DLUO »
- 🟡 **Phase 8** — Mise en production : déploiement Netlify ✅ sur
  `https://gestion-bissap-artisanal.blowdok.fr` (sous-domaine provisoire).
  Reste à faire : domaine définitif + vérification Resend, recette client,
  formation utilisateurs.

## Comptes de test (dev)

| Rôle | Email | Mot de passe |
|---|---|---|
| Patron | `patron@bissapa.test` | `Patron2026!` |
| Production | `fabrication@bissapa.test` | `Fabrication2026!` |
| Livreur | `livreur@bissapa.test` | `Livreur2026!` |

---

## 🏢 Comptes infrastructure du Patron

> **Important** : l'application est actuellement déployée sur l'infrastructure
> du développeur (comptes Supabase / Netlify / Resend de Blowdok). Pour la
> mise en service définitive, **le Patron Bissapa doit créer ses propres
> comptes** afin d'être propriétaire de ses données et de payer directement
> les éventuels frais de service.
>
> Cette migration se fait **avant** la bascule des données de test
> ([section suivante](#-passage-en-production--remplacer-les-données-de-test)).

### Pourquoi le Patron doit avoir ses propres comptes

| Raison | Détail |
|---|---|
| 🛡️ Propriété des données | Toutes les factures, clients, finances appartiennent à Bissapa, pas au prestataire |
| 💳 Facturation directe | Au-delà des plans gratuits, Bissapa paie directement (pas de re-facturation) |
| 🔒 Conformité | Le Patron reste seul responsable du traitement RGPD de ses clients |
| 🔑 Continuité | Si le prestataire change, l'infra reste en place sans interruption |

### A. Compte Supabase (base de données + auth)

**Plan gratuit** suffisant pour démarrer (jusqu'à 500 Mo de DB, 50 000 utilisateurs auth, 1 Go Storage).

> 💡 **Recommandation : créer 2 projets Supabase chez Emmanuel**
>
> | Projet | Usage | Seed à appliquer |
> |---|---|---|
> | `bissapa-staging` | Formation, recette, démo, tests futurs (V2) | `seed.sql` (avec clients fictifs) |
> | `bissapa-prod` | Production réelle | `seed-production.sql` (catalogue seul) |
>
> Avantage : la prod démarre **vraiment vide**, aucun risque d'oublier de purger
> les données de formation. Le projet staging restera utile pour tester les
> futures évolutions sans toucher aux vraies données. Les deux projets sont
> gratuits.

1. Créer un compte sur https://supabase.com avec l'email d'Emmanuel
2. **New project** → nom : `bissapa-prod` → région : **Europe (Paris ou Frankfurt)** ⚠️ pour le RGPD
3. Choisir un mot de passe DB fort (à stocker dans le gestionnaire de mots de passe d'Emmanuel)
4. Une fois le projet créé, récupérer dans **Settings → API** :
   - `Project URL` → futur `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → futur `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → futur `SUPABASE_SERVICE_ROLE_KEY` (⚠️ ultra-sensible)
5. **Initialiser le schéma** :
   - **SQL Editor** → coller à la suite chacun des fichiers du dossier
     `supabase/migrations/` **dans l'ordre numérique** (`0001_*.sql`, puis
     `0002_*.sql`, etc.) → exécuter chacun
   - Coller [`supabase/seed-production.sql`](./supabase/seed-production.sql)
     → exécuter (insère uniquement les 10 produits, **rien d'autre**)
   - ⚠️ **Ne pas utiliser `seed.sql`** : ce fichier contient en plus 3 clients
     fictifs destinés au développement local uniquement
6. **Créer le bucket Storage** :
   - **Storage → New bucket** → nom : `justificatifs` → **Private** (non public)
7. **Configurer Auth** :
   - **Authentication → URL Configuration**
   - Site URL : URL prod du Patron (ex: `https://app.bissapa.fr`)
   - Redirect URLs : ajouter `https://app.bissapa.fr/**`
8. **Créer les utilisateurs** : depuis le dashboard, **Authentication → Users
   → Add user** (au moins le compte Patron pour la première connexion). Les
   autres comptes seront créés ensuite via l'app (Admin → Utilisateurs).

### B. Compte Netlify (hébergement de l'app)

**Plan gratuit** suffisant (100 Go bande passante / mois, builds illimités).

1. Créer un compte sur https://netlify.com avec l'email d'Emmanuel
2. **Add new site → Import an existing project**
3. Connecter GitHub et choisir le repo `gestion-boissons-bissapartisanal`
   - Le repo peut rester chez Blowdok et donner accès en lecture à Emmanuel,
     OU être transféré dans son organisation GitHub
4. Build settings : **Next.js** détecté automatiquement (rien à modifier, le
   `netlify.toml` est dans le repo)
5. **Avant de déployer**, ajouter toutes les variables d'environnement
   ([liste complète plus haut](#variables-denvironnement-requises)) avec les
   **valeurs du nouveau projet Supabase** créé à l'étape A
6. Premier déploiement → tester sur l'URL `https://<random>.netlify.app`
7. **Domain settings → Add custom domain** → nom de domaine définitif du
   Patron (ex: `app.bissapa.fr`)
   - Suivre les instructions DNS chez le registrar du Patron (CNAME ou A record)
   - HTTPS automatique via Let's Encrypt
8. Mettre à jour `NEXT_PUBLIC_APP_URL` avec le domaine définitif puis
   **Trigger deploy → Clear cache and deploy site**

### C. Compte Resend (envoi des factures par email)

**Plan gratuit** : 100 emails / jour, 3 000 / mois → largement suffisant pour Bissapa.

1. Créer un compte sur https://resend.com avec l'email d'Emmanuel
2. **API Keys → Create API Key** → nom : `bissapa-prod` → permission
   **Sending access** → copier la clé (commence par `re_…`)
3. **Domains → Add Domain** → entrer le nom de domaine du Patron (ex:
   `bissapa.fr`)
4. Ajouter les **enregistrements DNS** affichés (SPF + DKIM + MX optionnel)
   chez le registrar
5. Cliquer **Verify** une fois la propagation DNS faite (qq minutes à 1h)
6. Une fois vérifié, ajouter dans Netlify :
   - `RESEND_API_KEY=re_xxxxxxxxxxxx`
   - `RESEND_FROM=Le Bissap Artisanal <facture@bissapa.fr>`
7. **Clear cache and deploy site** → tester l'envoi d'une facture depuis
   l'app pour vérifier la réception

### D. (Optionnel) Compte GitHub

Si Emmanuel veut être **propriétaire du code source** (recommandé pour la
pérennité), demander le **transfert du repo** ou un **fork** dans son
organisation GitHub. Sinon le code reste chez Blowdok et Emmanuel a accès
en lecture.

---

## 🚀 Passage en production — Remplacer les données de test

Cette section décrit la **bascule unique** à faire au moment de mettre l'app
en service réel chez Bissapa, **après** que le Patron ait créé ses propres
comptes infra ([section précédente](#-comptes-infrastructure-du-patron)).

À faire **dans l'ordre**, en une seule séance.

### 1. Compléter les infos entreprise manquantes

Ouvrir Netlify → **Project configuration → Environment variables** et ajouter
les variables liées au RIB pour qu'il apparaisse sur les factures PDF :

| Variable | Valeur à demander au Patron |
|---|---|
| `NEXT_PUBLIC_ENTREPRISE_IBAN` | IBAN du compte pro (FR76 …) |
| `NEXT_PUBLIC_ENTREPRISE_BIC` | Code BIC/SWIFT |
| `NEXT_PUBLIC_ENTREPRISE_BANQUE` | Nom de la banque (ex: « Crédit Mutuel ») |

Toutes les autres infos entreprise sont déjà dans `lib/config/entreprise.ts`
(raison sociale, SIRET, adresse, téléphones, email). Les modifier là si
besoin, sinon laisser les défauts.

> ⚠️ Les variables `NEXT_PUBLIC_*` sont **figées au build**. Après les avoir
> ajoutées : **Trigger deploy → Clear cache and deploy site**.

### 2. Créer le vrai compte Patron (Emmanuel)

1. Se connecter en tant que `patron@bissapa.test`
2. Aller dans **Admin → Utilisateurs → + Nouvel utilisateur**
3. Renseigner les infos d'Emmanuel (nom, email réel, rôle = **Patron**)
4. Mot de passe temporaire — Emmanuel le changera à sa première connexion via
   « Mot de passe oublié » sur l'écran de login
5. **Se déconnecter** et se reconnecter avec le compte d'Emmanuel pour vérifier
   qu'il a bien tous les accès

### 3. Créer les vrais comptes opérateurs (le cas échéant)

Toujours depuis **Admin → Utilisateurs**, créer les comptes :
- **Adjoint(s)** si Emmanuel veut désigner un Patron de remplacement
- **Production** : 1 compte par fabricant
- **Livreur / Vendeur** : 1 compte par tournée

### 4. Désactiver les 3 comptes de test

Depuis le compte d'Emmanuel, **Admin → Utilisateurs** :
- Désactiver `patron@bissapa.test`, `fabrication@bissapa.test`,
  `livreur@bissapa.test` (toggle « Actif »)

> Pourquoi désactiver et pas supprimer : conserve l'audit / traçabilité des
> actions passées en mode test. Une fois en prod, ces comptes ne pourront
> plus se connecter mais leur historique reste lisible.

### 5. (Si nécessaire) Purger les données de test

> ✅ **Si tu as suivi l'étape A.5 et appliqué `seed-production.sql`** (et pas
> `seed.sql`), la base est déjà vide côté clients/lots/livraisons et il n'y
> a **rien à faire** ici. Tu peux passer à l'étape 6.

Cette étape ne concerne que le cas où tu aurais saisi des **données de
test directement dans la base de prod** (formation, démo avec Emmanuel,
recette interne). Pour vider :

1. **Supabase Dashboard → SQL Editor**
2. Coller [`supabase/cleanup-test-data.sql`](./supabase/cleanup-test-data.sql)
3. Exécuter (`Ctrl+Enter`)
4. Vérifier la sortie finale : seul `produits` doit rester à 10, tout le
   reste à 0

Ce script vide livraisons + factures + paiements + dépenses + lots +
mouvements + supprime les 3 clients fictifs s'ils sont là, et réinitialise
la séquence des n° de facture (repart à `FAC-AAAA-00001`). Le catalogue
produits est conservé.

> 💡 **Bonne pratique** : pour la formation et la recette avec Emmanuel,
> utilise un environnement de **dev/staging séparé** (un 2ᵉ projet Supabase
> gratuit) au lieu de polluer la prod. Tu lui livres une base propre dès
> le départ et il n'y a aucun risque d'oubli de purge.

### 6. Configurer Resend en mode prod (envoi des factures par email)

Tant que le domaine n'est pas vérifié chez Resend, l'envoi reste en mode
test → seuls les emails vers `leconstantbillal@gmail.com` partent.

Dès qu'Emmanuel fournit son nom de domaine définitif (ex: `bissapa.fr`) :
1. Resend Dashboard → **Domains → Add Domain** → suivre les DNS (SPF + DKIM)
2. Une fois vérifié, mettre à jour la variable Netlify
   `RESEND_FROM=Le Bissap Artisanal <facture@bissapa.fr>`
3. **Clear cache and deploy site**

### 7. Vérifications finales avant remise au client

- [ ] PDF facture vierge téléchargé : RIB visible, SIRET correct, mentions OK
- [ ] Email de reset password fonctionne (lien vers le bon domaine)
- [ ] Compte Emmanuel actif, comptes `.test` désactivés
- [ ] Base purgée (script `cleanup-test-data.sql` exécuté)
- [ ] Récupération du logo Bissapa pour les PDFs (optionnel — à intégrer
      dans `lib/pdf/styles.ts` ou en haut des templates)
- [ ] PV de recette signé par Emmanuel
