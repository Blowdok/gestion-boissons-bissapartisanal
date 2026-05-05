# Gestion Boissons

Application web sur mesure pour la gestion intégrée d'une entreprise artisanale
de production de boissons (8 parfums, distribution B2B à La Réunion).

Centralise : production / lots, stock temps réel avec FIFO sur DLUO, clients
B2B et tarifs personnalisés, livraisons + facturation PDF, finance avec
répartition automatique 50/30/20, et tableau de bord patron.

Trois rôles : **Patron** (accès complet), **Fabrication** (production / stock),
**Livreur** (tournées / encaissements).

## Stack technique

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **shadcn/ui** (composants accessibles)
- **Supabase** : PostgreSQL, Auth (email + mot de passe), Storage, RLS
- **react-pdf** : bons de livraison et factures
- **Zod + React Hook Form** : validation et formulaires
- **Recharts** : graphiques du tableau de bord
- **Vitest** : tests unitaires sur la logique métier
- **Playwright** : tests end-to-end par rôle
- Hébergement : **Vercel** (frontend) + **Supabase** (backend)

## Prérequis

- Node.js 20+
- npm 10+
- Un projet Supabase (région UE)
- Un compte Vercel pour le déploiement

## Installation

```bash
npm install
cp .env.local.example .env.local
# Renseigner les clés Supabase dans .env.local
npm run dev
```

L'application est disponible sur http://localhost:3000.

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
app/                     # Routes Next.js (App Router)
components/              # Composants React (shadcn/ui dans ui/)
lib/
  ├── supabase/          # Clients Supabase (browser, server, middleware)
  ├── auth/              # Rôles et guards par profil
  ├── domain/            # Logique métier pure (FIFO, répartition 50/30/20)
  ├── utils/             # Formatters EUR, dates fr-FR
  └── pdf/               # Templates react-pdf (à venir Phase 3)
supabase/
  ├── migrations/        # Schéma SQL versionné
  └── seed.sql           # 8 parfums + jeu d'essai
tests/
  ├── unit/              # Tests Vitest (logique métier)
  └── e2e/               # Tests Playwright par rôle
proxy.ts                 # Refresh session + redirection par rôle (Next.js 16)
```

## Documentation

- Cahier des charges : `Cahier_des_Charges_Application_Gestion_Boissons.docx`
- Devis : `Devis_Application_Gestion_Boissons.docx`
- Plan d'implémentation : voir le plan validé en début de projet

## État du projet

- ✅ **Phase 0** — Cadrage & bootstrap : scaffolding Next.js, shadcn/ui,
  helpers Supabase, logique métier (FIFO, 50/30/20) avec tests
- ⏳ **Phase 1** — Fondations + module Clients (en attente)
- ⏳ **Phase 2** — Module Stock & Production
- ⏳ **Phase 3** — Module Livraisons & Facturation
- ⏳ **Phase 4** — Module Finance & Tableau de bord
- ⏳ **Phase 6** — Recette, formation, mise en production
