# PROMPT — Cloner l'application de Gestion Société pour BlowVizion

> Ce fichier est un prompt complet à donner à un agent IA (Claude Code, Cursor,
> Copilot, etc.) pour recréer la **même application** que celle développée pour
> **Le Bissap Artisanal**, mais dédiée à **ton entreprise BlowVizion**.
>
> **Mode d'emploi :**
>
> 1. Remplir la section "🎯 Personnalisation" ci-dessous (5 minutes)
> 2. Créer un dossier vide pour le nouveau projet
> 3. Coller TOUT le contenu de ce fichier dans une nouvelle conversation avec
>    l'agent IA, en lui disant : "Crée cette application complète"
> 4. L'agent va scaffolder, installer, coder, tester

---

## 🎯 Personnalisation — à remplir avant de lancer le prompt

```yaml
# Informations entreprise
nom_entreprise: "BlowVizion"
forme_juridique: "EI"                 # EI, SAS, SARL, EURL, etc.
gerant: "Prénom Nom du gérant"
siret: "XXX XXX XXX XXXXX"
adresse: "Rue, numéro"
code_postal: "XXXXX"
ville: "Ville"
pays: "France"
telephone_mobile: "(+33) 0X XX XX XX XX"
telephone_fixe: ""                    # optionnel
email_contact: "contact@blowvizion.fr"
domaine_app: "app.blowvizion.fr"      # URL de prod prévue
iban: "FR76 XXXX XXXX XXXX XXXX XXXX XXX"
bic: "XXXXXXXX"
banque: "Nom de la banque"
mention_tva: "TVA non applicable, art. 293 B du CGI"   # ou "TVA FR12345678901"

# Secteur d'activité (à adapter — déterminera les concepts métier)
secteur_activite: "production de boissons artisanales"   # ex modèles ci-dessous
gammes_produits:
  - nom: "Gamme A"
    format: "25cl"
    nb_references: 8
  - nom: "Gamme B"
    format: "60ml"
    nb_references: 2
unite_consigne: "bouteille"           # ou flacon, palette, etc. — laisser vide si pas de consigne
tarif_consigne_defaut_eur: 0.05       # 0 si pas de consigne

# Préférences techniques
langue_interface: "français"
fuseau_horaire: "Indian/Reunion"      # ex: Indian/Reunion, Europe/Paris
devise: "EUR"
locale_format: "fr-FR"
```

---

## 📋 Brief général à donner à l'agent

> Tu vas créer une application web sur mesure pour `{{nom_entreprise}}`
> ({{secteur_activite}}, basée à {{ville}}, {{pays}}). C'est une **gestion
> intégrée** d'une petite entreprise : production, stock, clients B2B,
> livraisons, facturation, paiements, finance, dépenses, dashboard analytique.
>
> L'app est conçue pour **un patron + 1-5 employés** maximum. Elle doit être
> **simple, française, mobile-friendly**, et tourner sur des infrastructures
> **gratuites ou à coût très faible** (Supabase free + Netlify free + Resend
> free + ImprovMX free).
>
> Toute l'interface, le code, les commentaires, les commits, les emails et les
> documents PDF sont en **français**.

---

## 🛠️ Stack technique imposée

- **Framework** : Next.js 16 (App Router, Server Components, Server Actions)
- **Bundler** : Turbopack (activé par défaut Next.js 16)
- **Langage** : TypeScript strict
- **UI** : Tailwind CSS v4 + shadcn/ui (composants accessibles)
- **Thème** : next-themes pour dark mode (clair / sombre / système)
- **Validation** : Zod (forms, server actions, schémas API)
- **Base de données** : Supabase (PostgreSQL + Auth + Storage)
  - PostgreSQL avec migrations versionnées dans `supabase/migrations/`
  - Row Level Security (RLS) granulaire par rôle utilisateur
  - Triggers SQL pour automatisations (création profil, mises à jour stock)
- **Auth** : Supabase Auth (email + mot de passe), pas d'OAuth
- **Storage** : Supabase Storage bucket privé `justificatifs/` (photos dépenses)
- **PDF** : `@react-pdf/renderer` pour Bons de livraison + Factures
- **Email transactionnel** : Resend (envoi factures avec PDF en pièce jointe)
- **Redirection email** : ImprovMX (gratuit) pour aliases @domaine → Gmail
- **Graphiques** : Recharts (dashboard finance)
- **Tests** : Vitest sur la logique métier pure (FIFO, calculs stock, etc.)
- **Hébergement** : Netlify (frontend) + Supabase (backend)
- **Versions** : Node.js 22 LTS minimum, npm 10+

**Toutes les versions de packages doivent être les plus récentes** disponibles
au moment de la création. Utiliser Context7 si disponible pour vérifier les
APIs à jour.

---

## 🏗️ Architecture des dossiers

```
{{nom_projet}}/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Routes publiques (login, reset password)
│   │   ├── login/
│   │   └── reset/
│   │       └── confirm/
│   ├── (app)/                    # Routes authentifiées (layout commun)
│   │   ├── layout.tsx            # Sidebar + topbar + protection middleware
│   │   ├── page.tsx              # Dashboard
│   │   ├── clients/
│   │   ├── produits/             # ou autre nom selon secteur
│   │   ├── livraisons/
│   │   ├── factures/
│   │   ├── paiements/
│   │   ├── finance/
│   │   │   ├── depenses/
│   │   │   └── dashboard/
│   │   ├── lots/                 # Production
│   │   ├── stock/
│   │   ├── admin/
│   │   │   ├── utilisateurs/
│   │   │   ├── parametres/
│   │   │   └── reset/
│   │   └── copilot/              # Optionnel V2 IA
│   ├── auth/
│   │   └── callback/             # CRITIQUE : route PKCE pour reset mdp
│   │       └── route.ts
│   └── api/                      # Routes API si nécessaire
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── ...                       # Composants métier réutilisables
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Client SSR
│   │   ├── client.ts             # Client browser
│   │   ├── admin.ts              # Client service_role (server-only)
│   │   └── middleware.ts         # Refresh session
│   ├── auth/
│   │   ├── guards.ts             # requireRole(), requireUser()
│   │   └── roles.ts              # Types Role
│   ├── config/
│   │   └── entreprise.ts         # Infos entreprise (surcharge ENV vars)
│   ├── pdf/
│   │   ├── facture.tsx           # Template PDF facture
│   │   ├── bon-livraison.tsx     # Template PDF BL
│   │   ├── styles.ts             # Styles partagés
│   │   ├── logo.ts               # Logo encodé base64
│   │   └── types.ts
│   ├── email/
│   │   ├── resend.ts             # Client Resend + RESEND_FROM/REPLY_TO
│   │   └── send-facture.tsx      # Envoi facture avec PDF
│   ├── domain/                   # Logique métier pure (testable)
│   │   ├── fifo.ts               # FIFO stock
│   │   ├── stock.ts              # Calculs stock dispo/perdu/livré
│   │   ├── repartition.ts        # Répartition multi-paiements
│   │   └── source-fonds.ts       # Logique enveloppes budgétaires
│   └── utils/
│       └── format.ts             # formatEUR, formatDate, etc.
├── supabase/
│   ├── migrations/               # Numérotées 0001_, 0002_, …
│   ├── seed.sql                  # DEV : produits + clients fictifs + lots
│   ├── seed-production.sql       # PROD : uniquement les produits
│   └── cleanup-test-data.sql     # Purge données de test
├── scripts/
│   ├── seed-users.mjs            # Crée les 3 users de test (admin API)
│   └── check-*.mjs               # Scripts de vérification ponctuelle
├── tests/
│   └── unit/                     # Vitest sur lib/domain/*
├── docs/
│   └── formation-utilisateurs.md # Guide pratique pour le Patron + équipe
├── public/
│   └── logo.png                  # Logo entreprise pour PDFs/favicon
├── .env.local.example
├── netlify.toml
├── tsconfig.json
├── package.json
└── README.md
```

---

## 👥 Modèle de rôles et permissions (RLS)

L'application a **4 rôles** stockés dans `public.profiles.role` (enum
`role_utilisateur`) :

| Rôle | Permissions |
|---|---|
| **patron** | Accès complet : finance complète (3 enveloppes), paramètres globaux, gestion utilisateurs, suppressions définitives. Un seul Patron par installation, non attribuable via l'UI |
| **adjoint** | « Patron par intérim » : opérationnel complet + dashboard (sans l'enveloppe Personnel) + finance limitée (Réinvestissement + Charges, jamais Personnel). Ne peut ni promouvoir vers Patron ni supprimer définitivement (annulations uniquement) |
| **fabrication** | Lots de production, stock, livraisons, lecture clients (pas d'écriture sur tarifs ni paramètres) |
| **livreur** | Tournées du jour, livraisons assignées, encaissements terrain, création client à la volée |

**Helper SQL** : fonction `auth_role()` qui renvoie le rôle de l'utilisateur
connecté ou NULL. Utilisée dans toutes les policies RLS.

**Trigger** : `handle_new_user()` qui, à chaque insert dans `auth.users`,
provisionne une ligne dans `public.profiles` avec le nom et rôle lus depuis
`raw_user_meta_data`. Fallback sur le rôle `livreur` si non spécifié.

**Garde-fous** :

- Le rôle `patron` n'est JAMAIS attribuable depuis l'UI admin (réservé au
  propriétaire de l'entreprise, modifié manuellement en base si besoin)
- Un adjoint ne peut créer qu'un fabrication ou livreur

---

## 📦 Modules fonctionnels

### 1. Production (lots)

- Saisie de lots avec date « à consommer de préférence avant le » (DDM)
- Traçabilité ingrédients (par produit, structurée)
- Gestion des pertes (casse, péremption) → impact stock automatique
- Numérotation des lots par produit

### 2. Stock

- Vue temps réel par produit : produite / livrée / perdue / disponible
- Alertes sous seuil (configurable par produit)
- **FIFO automatique** sur la date « à consommer avant » (algo testé)
- Mouvements traçables (entrée production, sortie livraison, perte)

### 3. Clients B2B

- Annuaire avec recherche
- Tarifs personnalisés par produit (table `tarifs_clients`)
- Conditions de paiement par client (défaut : 30 jours fin de mois)
- Email obligatoire pour envoi facture automatique

### 4. Livraisons & Tournées

- Création avec sélection produits + quantités
- **Heure prévue optionnelle** (créneau type « 14h chez X »)
- Tournée du jour triée par heure ascendant (sans-créneau en fin)
- Assignation à un livreur
- Statuts : prévue / en cours / livrée / annulée
- Édition des métadonnées tant que statut = `prévue`
- Heure ajoutée sur le PDF Bon de livraison (pas sur la facture)

### 5. Facturation

- Génération **automatique** au marquage `livrée`
- Numérotation séquentielle `FAC-YYYY-NNNNN` via sequence Postgres
- Mentions légales (TVA art. 293 B CGI pour franchise, ou taux normal)
- État de règlement affiché dans le PDF : acquittée / partiel / reste à payer
- Pièce jointe PDF dans l'email envoyé au client (Resend)

### 6. Système de consigne (optionnel selon secteur)

- Crédit configurable par unité rendue vide (paramètre global)
- Saisi au moment de marquer la livraison comme livrée
- Automatiquement déduit du montant à payer sur la facture

### 7. Paiements

- Multi-modes : espèces, virement, chèque, carte
- Multi-dates : chèques post-datés gérés comme paiements promis
- Répartition multi-factures pour un même paiement (algo testé)

### 8. Finance

- Saisie dépenses avec **photo justificatif** (Supabase Storage)
- **3 enveloppes budgétaires** : Réinvestissement / Charges / Personnel
- **Paiements multi-échéances** : échéances prévues + règlements effectifs,
  dette fournisseur ouverte sans date possible
- Catégorisation par 11 catégories standards (à adapter au secteur)
- 4 statuts de paiement : Prévu / Partiel / Payé / Annulé

### 9. Dashboard analytique

- KPIs en haut : CA, Décaissements, Résultat, sur la période
- Vue enveloppes : alloué × consommé × solde
- Graphique 12 mois (Recharts) : flux mensuel CA vs dépenses
- Top 5 clients & top 5 produits
- Export comptable CSV mensuel : factures, encaissements, dépenses engagées,
  décaissements effectifs (cash flow réel)

### 10. Admin

- Gestion utilisateurs (création avec génération mot de passe temp + rôle)
- Catalogue produits (ajout/modif/désactivation, jamais suppression dure)
- Paramètres globaux : tarif consigne, conditions de paiement défaut, etc.
- Réinitialisation des données opérationnelles (mode démo)

---

## 🎨 Conventions UI / UX

- **Mobile-first** : tout doit être utilisable sur smartphone
- **Dark mode** : intégral via `next-themes` (clair / sombre / système)
- **Sidebar sticky** avec scroll interne quand la navigation est longue
- **Badges colorés** par statut (vert = OK, orange = warning, rouge = erreur)
- **Suffixe `(adj)`** sur les noms des Adjoints dans les listes
- **Logo entreprise** intégré aux PDFs (haut à gauche)
- **Favicon** correspondant au logo (à fournir par le client)
- **Branding** : titre des pages = `{{nom_entreprise}} · Gestion Société`
- **Libellés réglementaires** : utiliser les termes officiels (ex « À consommer
  de préférence avant le » et non « DLUO » obsolète depuis 2014)

---

## 🔐 Pipeline d'authentification

### Login / Logout

- Page `/login` avec email + mot de passe
- Pas de signup public (les comptes sont créés par le Patron via `/admin/utilisateurs`)
- Server Action `signIn` avec validation Zod

### Reset mot de passe (CRITIQUE — bug fréquent)

Le flow Supabase PKCE moderne requiert une route de callback dédiée :

1. Page `/reset` : saisie email → `supabase.auth.resetPasswordForEmail()` avec
   `redirectTo: ${appUrl}/auth/callback?next=/reset/confirm`
2. **Route `/auth/callback/route.ts`** :
   - Reçoit `?code=xxx&next=/reset/confirm`
   - Appelle `supabase.auth.exchangeCodeForSession(code)` pour créer la session
   - Redirige vers `next` (avec session active dans les cookies)
   - Fallback : si `token_hash` au lieu de `code`, utiliser `verifyOtp`
   - Utiliser `process.env.NEXT_PUBLIC_APP_URL` comme origin pour les redirects
     (sur Netlify, `request.url` peut contenir l'URL interne du déploiement)
3. Page `/reset/confirm` : saisie nouveau mdp → `supabase.auth.updateUser({ password })`

**Sans cette route `/auth/callback`, le reset password échoue avec "Lien
expiré ou invalide"** car `updateUser` n'a pas de session pour exécuter.

### Middleware

`lib/supabase/middleware.ts` rafraîchit la session sur chaque request et
redirige vers `/login` les routes non publiques.

Routes publiques :
- `/`
- `/login`
- `/reset` (et sous-routes)
- `/auth/callback`

---

## 📧 Configuration Resend + ImprovMX (envoi & réception)

### Resend (envoi)

- Plan gratuit suffit (100/jour, 3000/mois)
- **Domaine vérifié** dans Resend (SPF + DKIM dans les DNS)
- Choisir une **clé API "Full access"** (PAS "Sending access" restreint, qui
  casse à chaque manip du domaine)
- Variables d'env :
  - `RESEND_API_KEY=re_xxxxxxxxxxxx`
  - `RESEND_FROM=Nom Entreprise <facture@{{domaine}}>` (ou avec un sous-domaine
    si Resend l'impose : `<facture@societe.{{domaine}}>`)
  - `RESEND_REPLY_TO={{email_contact}}` (optionnel — utile si l'expéditeur est
    sur un sous-domaine technique non réceptif)

### ImprovMX (réception)

- Plan gratuit suffit (25 alias max)
- Add domain → racine `{{domaine}}` → ajouter 2 MX + 1 TXT SPF dans les DNS
- Créer alias :
  - `facture@{{domaine}}` → `<gmail-perso-du-patron>`
  - `contact@{{domaine}}` → `<gmail-perso-du-patron>`
  - `*@{{domaine}}` (catch-all, recommandé) → idem
- **Attention** : un seul SPF TXT par domaine. Si Resend et ImprovMX sont tous
  les deux sur le domaine racine, fusionner en `v=spf1 include:amazonses.com
  include:spf.improvmx.com ~all`

### Code email

`lib/email/send-facture.tsx` envoie la facture en pièce jointe via
`resend.emails.send()` avec :
- `from: RESEND_FROM`
- `replyTo: RESEND_REPLY_TO ?? ENTREPRISE.email`
- `attachments: [{ filename: '<numéro>.pdf', content: pdfBuffer }]`

---

## 🌐 Variables d'environnement

### Requises (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # server only, NEVER expose
NEXT_PUBLIC_APP_URL=https://{{domaine_app}}    # prod : https://, dev : http://localhost:3000
```

### Optionnelles

```
RESEND_API_KEY=re_xxx
RESEND_FROM=Nom Entreprise <facture@{{domaine}}>
RESEND_REPLY_TO={{email_contact}}
NEXT_PUBLIC_ENTREPRISE_NOM={{nom_entreprise}}
NEXT_PUBLIC_ENTREPRISE_GERANT={{gerant}}
NEXT_PUBLIC_ENTREPRISE_SIRET={{siret}}
NEXT_PUBLIC_ENTREPRISE_ADRESSE={{adresse}}
NEXT_PUBLIC_ENTREPRISE_CP={{code_postal}}
NEXT_PUBLIC_ENTREPRISE_VILLE={{ville}}
NEXT_PUBLIC_ENTREPRISE_EMAIL={{email_contact}}
NEXT_PUBLIC_ENTREPRISE_IBAN={{iban}}
NEXT_PUBLIC_ENTREPRISE_BIC={{bic}}
NEXT_PUBLIC_ENTREPRISE_BANQUE={{banque}}
```

---

## 🚀 Plan de développement suggéré (phases)

Suivre cet ordre pour livrer de la valeur tôt et tester chaque couche :

1. **Phase 0 — Bootstrap** : Next.js 16 + Supabase + shadcn/ui + Tailwind v4 +
   thème dark/light + login basique + page d'accueil vide protégée
2. **Phase 1 — Schéma initial** : tables `profiles`, `produits`, `clients`,
   `tarifs_clients` + RLS + helper `auth_role()` + trigger `handle_new_user`
3. **Phase 2 — Production & stock** : tables `lots`, `mouvements_stock` + FIFO
   + pages production/lots + vue stock avec alertes seuil
4. **Phase 3 — Livraisons** : table `livraisons`, `lignes_livraison` + flow
   création → livrée + assignation livreur + tournée du jour mobile-first
5. **Phase 4 — Facturation & email** : table `factures` avec sequence + PDF
   `@react-pdf/renderer` (BL + Facture) + envoi Resend
6. **Phase 5 — Paiements** : table `paiements` + répartition multi-factures +
   états acquittée/partiel/reste à payer sur PDF
7. **Phase 6 — Finance & dépenses** : table `depenses` + enveloppes
   budgétaires + photo justificatif + dashboard analytique + export CSV
8. **Phase 7 — Admin & polish** : gestion utilisateurs UI + paramètres
   globaux + mode démo (reset données) + dark mode complet + responsive mobile
9. **Phase 8 — Déploiement** : Netlify + custom domain + Resend + ImprovMX +
   formation utilisateurs

À chaque phase :

- Migrations SQL versionnées (`supabase/migrations/00XX_*.sql`)
- Tests Vitest sur la logique métier pure
- Mise à jour `README.md` et `docs/formation-utilisateurs.md`

---

## ✅ Critères de qualité non négociables

- **Toutes les pages chargent en < 2s** sur connexion lente (lighthouse > 90)
- **Toute requête DB passe par les policies RLS** (ne JAMAIS contourner avec
  le service_role côté client)
- **Toute saisie utilisateur passe par Zod** (forms + server actions)
- **PDFs imprimables** : marges respectées, mentions légales présentes, IBAN
  visible sur facture
- **Aucune chaîne de caractère en dur** pour les données entreprise (toujours
  via `ENTREPRISE.*` qui lit les env vars)
- **Aucun secret en clair** dans le code (clés API, service_role, etc.)
- **Aucun TODO bloquant** mergé sur `main`
- **Branche dédiée `feature/v2-ai`** si on prévoit des features IA (à séparer
  de la V1 stable pour rester déployable indépendamment)

---

## 🧪 Tests recommandés

- **Vitest unitaires** sur :
  - FIFO stock (`lib/domain/fifo.ts`)
  - Répartition multi-paiements (`lib/domain/repartition.ts`)
  - Calculs stock (`lib/domain/stock.ts`)
  - Catégorisation enveloppes (`lib/domain/source-fonds.ts`)
- **Tests E2E manuels** documentés dans `docs/formation-utilisateurs.md`
- Pas de tests E2E automatisés au début (overkill pour un MVP)

---

## 📚 Documentation à produire

- `README.md` : pitch + stack + variables env + scripts + arborescence + état
  des phases + procédure déploiement client (Supabase + Netlify + Resend +
  ImprovMX + reset données test + vérifs finales)
- `docs/formation-utilisateurs.md` : guide pratique du Patron + employés.
  Suivre l'ordre d'une journée type (matin lots, après-midi livraisons,
  fin de mois facturation, etc.)

---

## 🔄 Procédure de livraison client (avec dépôt GitHub séparé)

Si tu veux livrer le code au client tout en gardant ton propre dépôt :

1. Code source canonique chez toi (compte `<dev>`, dépôt privé)
2. Dépôt client séparé chez le compte du client (ex `<client>/app-{{nom_projet}}`)
3. À chaque livraison : **clone temporaire** + suppression de tout fichier
   "interne dev" + remplacement des mentions du dev par des mentions
   neutres + **orphan commit unique** (1 seul commit "Initial release") +
   force-push vers le dépôt client, signé sous l'identité du client
4. Le dépôt client ne contient JAMAIS l'historique complet ni les références
   au développeur
5. Documenter cette procédure dans une note interne (pas dans le repo client)

---

## 🎁 Bonus suggérés (V2 IA, optionnel)

Après stabilisation de la V1, sur une branche `feature/v2-ai` séparée :

- **Scanner ticket photo** : OCR via Gemini Flash pour pré-remplir une dépense
- **Copilot conversationnel** : Claude Sonnet avec tool-calling sur les vues
  SQL pour répondre aux questions métier
- **Relances impayés** : Claude Haiku pour rédiger les emails de relance avec
  ton calibré selon l'ancienneté de la facture

Passerelle unifiée recommandée : **OpenRouter** (une seule clé pour 100+
modèles, fallback automatique, facturation unifiée). Budget estimé pour un
petit artisan : 5-15 €/mois maximum.

Dégradation gracieuse : si `OPENROUTER_API_KEY` n'est pas configurée, les
boutons IA affichent « IA non activée » et l'app fonctionne exactement comme
la V1.

---

## 🏁 Critère de succès

L'application est livrable à `{{nom_entreprise}}` quand :

- [ ] Toutes les phases 0-8 sont vertes
- [ ] Tests Vitest passent
- [ ] `https://{{domaine_app}}` charge sans erreur
- [ ] Reset mot de passe fonctionne end-to-end
- [ ] Envoi d'une facture par email atteint son destinataire (vérifié dans
      Resend dashboard + boîte mail réelle)
- [ ] Reply-To redirigé via ImprovMX arrive sur le Gmail du Patron
- [ ] Le compte Patron du client est créé, mot de passe communiqué en privé
- [ ] Toutes les données de test sont purgées (script `cleanup-test-data.sql`)
- [ ] `docs/formation-utilisateurs.md` est complet et adapté au métier
- [ ] Session de formation avec le client effectuée

Bonne livraison ! 🚀
