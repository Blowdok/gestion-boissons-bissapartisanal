# Le Bissap Artisanal — Gestion Société

Application web sur mesure pour **Le Bissap Artisanal** (Emmanuel Mbotifeno,
Le Port, La Réunion) — gestion intégrée d'une entreprise artisanale de
production de boissons.

**Catalogue** : 2 gammes — **Bissapa** (8 saveurs en bouteilles 25cl) et
**Zandjabila** (2 GingerShot en flacons 60ml). Extensible via le module Admin.

**Fonctionnalités principales** :
- Production : saisie de lots avec DLUO, gestion des pertes (casse, péremption)
- Stock : vue temps réel par produit, alertes sous seuil, FIFO automatique sur DLUO
- Clients B2B : annuaire, tarifs personnalisés par produit
- Livraisons : création, tournée du jour assignée au livreur, statuts
- Facturation : génération automatique à la livraison, numérotation séquentielle
  `FAC-YYYY-NNNNN`, mentions légales art. 293 B CGI
- PDF : Bon de livraison + Facture (templates react-pdf)
- Email transactionnel : envoi automatique de la facture au client (Resend)
- Paiements : multi-modes (espèces, virement, chèque, carte), multi-dates
  (chèques post-datés gérés comme paiements promis)
- Finance : saisie dépenses avec photo justificatif, répartition automatique
  50% réinvestissement / 30% charges / 20% personnel
- Dashboard : KPIs CA / Dépenses / Marge, graphique 12 mois, top 5 clients & produits
- Export comptable CSV mensuel pour transmission au comptable

**Quatre rôles** :
- **Patron** : accès complet, finance, gestion utilisateurs
- **Adjoint** : Patron temporaire avec restrictions (pas de finance, pas de
  promotion vers Patron, pas de suppression définitive)
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
  │   ├── production/            # Saisie lots avec DLUO
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
  ├── migrations/                # 14 migrations SQL versionnées
  └── seed.sql                   # 10 produits + 3 clients fictifs

tests/unit/                      # Tests Vitest (FIFO, répartition, stock)
scripts/                         # Helpers Node.js (seed-users, check-*, etc.)
proxy.ts                         # Refresh session + redirection par rôle
netlify.toml                     # Config déploiement Netlify
```

## Documentation

- Cahier des charges : `Cahier_des_Charges_Application_Gestion_Boissons.docx`
- Devis : `Devis_Application_Gestion_Boissons.docx`
- Plan d'implémentation : voir le plan validé en début de projet

## État du projet

- ✅ **Phase 0** — Cadrage & bootstrap : scaffolding Next.js 16, shadcn/ui,
  helpers Supabase, logique métier (FIFO, 50/30/20) avec tests
- ✅ **Phase 1** — Auth + Layout + Module Clients + Module Admin
  (utilisateurs, catalogue produits)
- ✅ **Phase 2** — Stock & Production : lots avec DLUO, vue stock temps réel,
  alertes seuil, saisie de pertes, vues SQL `stock_par_lot` / `stock_par_produit`
- ✅ **Phase 3** — Livraisons & Facturation : trigger FIFO, facture auto,
  numérotation séquentielle, génération PDF (BL + Facture), envoi email Resend,
  multi-paiements avec dates (chèques post-datés)
- ✅ **Phase 4** — Finance & Dashboard : dépenses avec justificatif Storage,
  KPIs CA/Dépenses/Marge, répartition 50/30/20, graphique 12 mois, top 5
  clients & produits, export CSV comptable
- ✅ **Bonus** — Rôle Adjoint (Patron temporaire), dark mode, badges colorés,
  sidebar sticky avec scroll interne, suffixe `(adj)` sur les Adjoints
- 🟡 **Phase 6** — Mise en production : déploiement Netlify ✅ sur
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
