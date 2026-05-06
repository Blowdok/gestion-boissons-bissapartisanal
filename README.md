# Gestion Boissons

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
`supabase link`. Les seeds (`supabase/seed.sql`) initialisent les 10
produits Bissapa + 3 clients fictifs. Les 3 utilisateurs de test sont
créés via `node --env-file=.env.local scripts/seed-users.mjs`.

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

## 🚀 Passage en production — Remplacer les données de test

Cette section décrit la **bascule unique** à faire au moment de mettre l'app
en service réel chez Bissapa. À faire **dans l'ordre**, en une seule séance.

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

### 5. Purger les données opérationnelles de test

Si tu as fait des saisies de test (lots, livraisons, factures, dépenses)
pendant la recette, **vide la base** avant le démarrage réel pour repartir à
zéro :

1. Ouvrir **Supabase Dashboard → ton projet → SQL Editor**
2. Coller le contenu du fichier [`supabase/cleanup-test-data.sql`](./supabase/cleanup-test-data.sql)
3. Exécuter (`Ctrl+Enter`)
4. Vérifier la sortie finale : seul `produits` doit rester à 10, tout le
   reste à 0

Ce script :
- supprime les 3 clients fictifs (`Le Marché Créole`, `Ti Boucan`, `Vavangue`)
- vide livraisons + factures + paiements + dépenses + lots + mouvements
- réinitialise la séquence des n° de facture (repart à `FAC-AAAA-00001`)
- **conserve** le catalogue produits (les 10 vrais Bissapa + Zandjabila)

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
