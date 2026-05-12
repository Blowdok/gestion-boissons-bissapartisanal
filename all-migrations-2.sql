-- ============================================================
-- Le Bissap Artisanal - Migrations consolidees (V1) - PARTIE 2
-- A executer APRES la partie 1, dans une NOUVELLE query SQL Editor.
-- Necessaire car Postgres refuse d'utiliser une valeur d'enum
-- ajoutee dans la meme transaction (erreur 55P04).
-- ============================================================


-- =============================================================================
-- 2. Refonte des policies RLS
-- Les policies existantes 'patron' restent inchangees (Patron garde tout)
-- On ajoute des policies 'adjoint' en parallele pour les operations qu'il peut
-- aussi effectuer.
-- =============================================================================

-- profiles : Adjoint peut tout sauf DELETE
drop policy if exists profiles_adjoint_select on public.profiles;
create policy profiles_adjoint_select on public.profiles
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists profiles_adjoint_insert on public.profiles;
create policy profiles_adjoint_insert on public.profiles
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists profiles_adjoint_update on public.profiles;
create policy profiles_adjoint_update on public.profiles
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');
-- Pas de DELETE pour Adjoint : suppression definitive reservee Patron

-- produits : Adjoint peut INSERT/UPDATE mais pas DELETE
drop policy if exists produits_adjoint_insert on public.produits;
create policy produits_adjoint_insert on public.produits
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists produits_adjoint_update on public.produits;
create policy produits_adjoint_update on public.produits
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- clients : Adjoint = full CRUD
drop policy if exists clients_adjoint_all on public.clients;
create policy clients_adjoint_all on public.clients
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- tarifs_clients : Adjoint = full CRUD
drop policy if exists tarifs_adjoint_all on public.tarifs_clients;
create policy tarifs_adjoint_all on public.tarifs_clients
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- lots : Adjoint = comme Fabrication (tout sauf DELETE qui n'est pas autorisee)
drop policy if exists lots_adjoint_write on public.lots;
create policy lots_adjoint_write on public.lots
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- mouvements_stock : Adjoint peut INSERT
drop policy if exists mouvements_adjoint_insert on public.mouvements_stock;
create policy mouvements_adjoint_insert on public.mouvements_stock
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

-- livraisons : Adjoint = full CRUD (sauf DELETE qui reste Patron)
drop policy if exists livraisons_adjoint_insert on public.livraisons;
create policy livraisons_adjoint_insert on public.livraisons
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists livraisons_adjoint_update on public.livraisons;
create policy livraisons_adjoint_update on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- lignes_livraison : Adjoint = INSERT + UPDATE + DELETE
drop policy if exists lignes_adjoint_insert on public.lignes_livraison;
create policy lignes_adjoint_insert on public.lignes_livraison
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists lignes_adjoint_update on public.lignes_livraison;
create policy lignes_adjoint_update on public.lignes_livraison
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

drop policy if exists lignes_adjoint_delete on public.lignes_livraison;
create policy lignes_adjoint_delete on public.lignes_livraison
  for delete to authenticated
  using (public.auth_role() = 'adjoint');

-- factures : Adjoint peut SELECT et UPDATE
drop policy if exists factures_adjoint_select on public.factures;
create policy factures_adjoint_select on public.factures
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists factures_adjoint_update on public.factures;
create policy factures_adjoint_update on public.factures
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- paiements : Adjoint peut SELECT/INSERT/UPDATE/DELETE
drop policy if exists paiements_adjoint_select on public.paiements;
create policy paiements_adjoint_select on public.paiements
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists paiements_adjoint_insert on public.paiements;
create policy paiements_adjoint_insert on public.paiements
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists paiements_adjoint_update on public.paiements;
create policy paiements_adjoint_update on public.paiements
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

drop policy if exists paiements_adjoint_delete on public.paiements;
create policy paiements_adjoint_delete on public.paiements
  for delete to authenticated
  using (public.auth_role() = 'adjoint');

-- =============================================================================
-- 3. Note pour la finance (Phase 4)
-- Quand on creera la table 'depenses', les policies seront 'patron only' :
-- l'Adjoint n'a PAS acces aux donnees financieres.
-- =============================================================================

-- ============================================================
-- 0011_elargir_permissions_terrain.sql
-- ============================================================
-- =============================================================================
-- Phase 3 (suite) — Elargir les permissions terrain
-- Le Livreur/Vendeur est aussi commercial : il prend des commandes sur le
-- terrain, peut creer/modifier un client, declarer une perte (casse en
-- transport), creer une livraison spontanee.
-- La Production peut consulter les clients en lecture (preparation commandes).
-- =============================================================================

-- clients : Livreur peut INSERT et UPDATE (creer un client sur le terrain,
-- corriger des coordonnees). Pas de DELETE (suppression reservee Patron).
drop policy if exists clients_livreur_insert on public.clients;
create policy clients_livreur_insert on public.clients
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

drop policy if exists clients_livreur_update on public.clients;
create policy clients_livreur_update on public.clients
  for update to authenticated
  using (public.auth_role() = 'livreur')
  with check (public.auth_role() = 'livreur');

-- (Le SELECT etait deja autorise pour livreur, fabrication etc.)

-- livraisons : Livreur peut INSERT (commande prise sur le terrain).
-- L'UPDATE etait deja autorise sur ses propres livraisons via livreur_id.
drop policy if exists livraisons_livreur_insert on public.livraisons;
create policy livraisons_livreur_insert on public.livraisons
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

-- lignes_livraison : Livreur peut INSERT (cree les lignes de la livraison
-- qu'il vient de creer sur le terrain). Le trigger FIFO se declenche
-- automatiquement comme pour les autres roles.
drop policy if exists lignes_livreur_insert on public.lignes_livraison;
create policy lignes_livreur_insert on public.lignes_livraison
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

-- mouvements_stock : Livreur peut INSERT pour declarer une perte (casse en
-- transport, retour client). Le trigger FIFO sur lignes_livraison cree deja
-- les mouvements 'livraison', mais pour 'perte' c'est un INSERT direct.
drop policy if exists mouvements_livreur_insert on public.mouvements_stock;
create policy mouvements_livreur_insert on public.mouvements_stock
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

-- ============================================================
-- 0012_profils_visibles_a_tous.sql
-- ============================================================
-- =============================================================================
-- Phase 3 (suite) — Permettre a tous les utilisateurs authentifies de lire
-- la liste des profils (id, nom, role, actif).
--
-- Cas d'usage : la Fabrication (ou le Livreur) qui cree une livraison doit
-- pouvoir choisir un livreur dans le dropdown. Sans cette policy, ils ne
-- voient que leur propre profil et la liste est vide.
--
-- C'est une donnee non sensible (savoir que Marie est Fabrication ou que Jean
-- est Livreur ne pose pas de probleme dans une petite equipe artisanale).
-- =============================================================================

drop policy if exists profiles_select_all_authenticated on public.profiles;
create policy profiles_select_all_authenticated on public.profiles
  for select to authenticated
  using (true);

-- Les anciennes policies (profiles_select_self, profiles_adjoint_select,
-- profiles_patron_all SELECT) deviennent redondantes pour le SELECT mais ne
-- gênent pas (RLS combine en OR). On peut les laisser pour clarte
-- documentaire ou les nettoyer plus tard.

-- ============================================================
-- 0013_depenses.sql
-- ============================================================
-- =============================================================================
-- Phase 4 — Finance : table depenses + bucket Storage 'justificatifs'
-- Acces strictement reserve au Patron (donnees financieres sensibles).
-- =============================================================================

-- ENUM des categories de depense (extensible plus tard si besoin)
do $$ begin
  create type public.categorie_depense as enum (
    'matieres_premieres',  -- fleur, sucre, aromes, ananas, gingembre, menthe...
    'emballage',           -- bouteilles, etiquettes, capsules
    'energie',             -- electricite, eau, gaz
    'transport',           -- carburant, entretien vehicule
    'marketing',           -- pub, salons, flyers
    'loyer',               -- local de production
    'assurance',           -- RC pro, multirisque
    'banque',              -- frais bancaires, terminal CB
    'salaires',            -- salaires + charges (si employes)
    'taxes',               -- impots, URSSAF, CFE
    'fournitures',         -- bureau, hygiene, petit materiel
    'autre'
  );
exception when duplicate_object then null; end $$;

-- Table depenses
create table if not exists public.depenses (
  id              uuid primary key default gen_random_uuid(),
  date            date not null default current_date,
  montant         numeric(10, 2) not null check (montant > 0),
  categorie       public.categorie_depense not null,
  description     text,
  -- Chemin du fichier dans le bucket Storage 'justificatifs' (peut etre null
  -- si pas de justificatif). Format : justificatifs/<uuid>/<filename>
  justificatif_path text,
  saisie_par      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists depenses_date_idx on public.depenses(date desc);
create index if not exists depenses_categorie_idx on public.depenses(categorie);

drop trigger if exists depenses_touch_updated on public.depenses;
create trigger depenses_touch_updated
  before update on public.depenses
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- RLS : depenses sont strictement Patron only
-- =============================================================================
alter table public.depenses enable row level security;

drop policy if exists depenses_patron_all on public.depenses;
create policy depenses_patron_all on public.depenses
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- L'Adjoint, Fabrication et Livreur n'ont AUCUN acces (pas de policy = pas d'acces)
-- C'est volontaire : les depenses revelent les marges, c'est confidentiel.

-- =============================================================================
-- Bucket Storage 'justificatifs' (cree dans une migration separee si besoin)
-- =============================================================================
-- Note : la creation des buckets via SQL n'est pas standard, generalement on
-- les cree via le dashboard Supabase ou l'API. La policy RLS sur storage.objects
-- ci-dessous prend effet une fois le bucket cree manuellement.

-- Policy storage : seul Patron peut lire/ecrire dans le bucket 'justificatifs'
drop policy if exists justificatifs_patron_select on storage.objects;
create policy justificatifs_patron_select on storage.objects
  for select to authenticated
  using (bucket_id = 'justificatifs' and public.auth_role() = 'patron');

drop policy if exists justificatifs_patron_insert on storage.objects;
create policy justificatifs_patron_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'justificatifs' and public.auth_role() = 'patron');

drop policy if exists justificatifs_patron_delete on storage.objects;
create policy justificatifs_patron_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'justificatifs' and public.auth_role() = 'patron');

-- ============================================================
-- 0014_vues_finance.sql
-- ============================================================
-- =============================================================================
-- Phase 4 — Vues SQL agregees pour le dashboard finance
-- security_invoker = on : la RLS du caller est appliquee aux tables sources
-- (donc seul le Patron qui voit la table depenses voit ces agregats).
-- =============================================================================

-- CA mensuel : somme des montants encaisses (paiements ou date_encaissement
-- dans le mois). On distingue ENCAISSE (effectif) vs PROMIS (cheques futurs).
drop view if exists public.ca_mensuel;
create view public.ca_mensuel
with (security_invoker = on)
as
select
  to_char(p.date_encaissement, 'YYYY-MM') as mois,
  sum(case when p.date_encaissement <= current_date then p.montant else 0 end)::numeric(12, 2) as ca_encaisse,
  sum(case when p.date_encaissement > current_date then p.montant else 0 end)::numeric(12, 2) as ca_a_encaisser,
  sum(p.montant)::numeric(12, 2) as ca_total,
  count(*)::integer as nb_paiements
from public.paiements p
group by to_char(p.date_encaissement, 'YYYY-MM');

-- Depenses mensuelles
drop view if exists public.depenses_mensuelles;
create view public.depenses_mensuelles
with (security_invoker = on)
as
select
  to_char(d.date, 'YYYY-MM') as mois,
  sum(d.montant)::numeric(12, 2) as depenses_total,
  count(*)::integer as nb_depenses
from public.depenses d
group by to_char(d.date, 'YYYY-MM');

-- Top clients du mois (par CA encaisse + a encaisser)
drop view if exists public.top_clients_mensuel;
create view public.top_clients_mensuel
with (security_invoker = on)
as
select
  to_char(p.date_encaissement, 'YYYY-MM') as mois,
  l.client_id,
  c.raison_sociale,
  sum(p.montant)::numeric(12, 2) as ca,
  count(distinct l.id)::integer as nb_livraisons
from public.paiements p
join public.factures f on f.id = p.facture_id
join public.livraisons l on l.id = f.livraison_id
join public.clients c on c.id = l.client_id
group by to_char(p.date_encaissement, 'YYYY-MM'), l.client_id, c.raison_sociale;

-- Top produits du mois (par CA, base sur date facture pour eviter la confusion
-- avec les paiements qui peuvent etre etales)
drop view if exists public.top_produits_mensuel;
create view public.top_produits_mensuel
with (security_invoker = on)
as
select
  to_char(f.date_emission, 'YYYY-MM') as mois,
  ll.produit_id,
  pr.nom as produit_nom,
  pr.gamme,
  sum(ll.qte)::integer as qte_vendue,
  sum(ll.qte * ll.prix_unitaire_ht)::numeric(12, 2) as ca_ht
from public.lignes_livraison ll
join public.livraisons l on l.id = ll.livraison_id
join public.factures f on f.livraison_id = l.id
join public.produits pr on pr.id = ll.produit_id
group by to_char(f.date_emission, 'YYYY-MM'), ll.produit_id, pr.nom, pr.gamme;

-- ============================================================
-- 0015_lot_ingredients.sql
-- ============================================================
-- =============================================================================
-- Tracabilite des ingredients utilises pour chaque lot Bissapa
--
-- Bissap secs (toujours obligatoires sur un Bissapa) : fleur de bissap, sucre, arome
-- Ingredients naturels (selon la saveur) : ananas, gingembre, menthe
--
-- L'application enregistre la DATE DE PEREMPTION de chaque ingredient utilise,
-- pour permettre :
--   - en cas de rappel fournisseur d'un lot d'ingredient, retrouver tous les
--     lots Bissapa qui l'ont utilise (vue ingredients_par_dluo)
--   - audit qualite a posteriori
--
-- Zandjabila n'est pas concerne pour l'instant (decision client : reporte).
-- =============================================================================

create type public.ingredient_type as enum (
  'fleur_bissap',
  'sucre',
  'arome',
  'ananas',
  'gingembre',
  'menthe'
);

create table public.lot_ingredients (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  nom public.ingredient_type not null,
  date_peremption date not null,
  note text,
  created_at timestamptz not null default now(),
  -- Un meme ingredient ne peut etre saisi qu'une fois par lot
  unique (lot_id, nom)
);

create index lot_ingredients_lot_id_idx on public.lot_ingredients(lot_id);
create index lot_ingredients_nom_dluo_idx
  on public.lot_ingredients(nom, date_peremption);

-- RLS alignee sur la table lots
alter table public.lot_ingredients enable row level security;

create policy lot_ingredients_select_authenticated
  on public.lot_ingredients
  for select to authenticated
  using (public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur'));

create policy lot_ingredients_patron_fab_write
  on public.lot_ingredients
  for all to authenticated
  using (public.auth_role() in ('patron', 'fabrication'))
  with check (public.auth_role() in ('patron', 'fabrication'));

create policy lot_ingredients_adjoint_write
  on public.lot_ingredients
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- Vue de tracabilite : pour un ingredient donne et une DLUO donnee,
-- liste les lots Bissapa qui l'ont utilise.
-- Utile en cas de rappel fournisseur (ex: lot de fleur de bissap rappele).
create or replace view public.lots_par_ingredient
with (security_invoker = on)
as
select
  li.nom as ingredient,
  li.date_peremption as ingredient_dluo,
  li.lot_id,
  l.numero_lot,
  l.date_production,
  l.dluo as lot_dluo,
  l.qte_produite,
  p.nom as produit_nom,
  p.gamme as produit_gamme
from public.lot_ingredients li
join public.lots l on l.id = li.lot_id
join public.produits p on p.id = l.produit_id;

comment on table public.lot_ingredients is
  'Tracabilite des ingredients utilises pour chaque lot de production. La date_peremption est celle de l ingredient, pas du lot fini.';

-- ============================================================
-- 0016_depenses_v2.sql
-- ============================================================
-- =============================================================================
-- Phase 5 — Dépenses V2
--   - Enveloppes : chaque dépense est rattachée à une source de fonds
--     (reinvestissement / charges / personnel) — calque du 50/30/20.
--   - Paiements multi-échéances : une dépense peut être réglée en N
--     paiements (date prévue et/ou date effective). Permet de gérer les
--     fournisseurs en plusieurs fois ou les dettes ouvertes sans date.
--
-- Données legacy : pour chaque dépense existante on crée AUTOMATIQUEMENT
-- un paiement rétrospectif (date_effectif = ancienne date, mode = 'autre',
-- note "Migration v2") afin que le passé reste cohérent.
--
-- Vues remplacées :
--   - depenses_mensuelles  →  depenses_engagees_mensuelles + decaissements_mensuels
--                             (engagement vs cash-flow)
--   + nouvelles vues : depenses_avec_solde, echeances_a_venir, enveloppes_mensuelles
-- =============================================================================

-- 1. ENUMs ------------------------------------------------------------------
do $$ begin
  create type public.source_fonds as enum ('reinvestissement', 'charges', 'personnel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mode_paiement_depense as enum (
    'especes', 'virement', 'cheque', 'prelevement', 'carte', 'autre'
  );
exception when duplicate_object then null; end $$;

-- 2. Colonnes ajoutées sur depenses ----------------------------------------
-- Note : on garde la colonne `date` (= date d'engagement de la dépense),
-- aucun renommage pour ne pas casser les requêtes existantes.
alter table public.depenses
  add column if not exists source_fonds public.source_fonds;

comment on column public.depenses.date is 'Date d''engagement de la dépense (commande / facture fournisseur). Les paiements réels sont dans paiements_depense.';
comment on column public.depenses.montant is 'Montant total engagé de la dépense (somme attendue des paiements_depense).';
comment on column public.depenses.source_fonds is 'Enveloppe budgétaire à laquelle la dépense est imputée (réinvestissement / charges / personnel). Pré-rempli depuis la catégorie côté UI.';

-- Backfill : mapping catégorie → source par défaut
update public.depenses
set source_fonds = case categorie
  when 'matieres_premieres' then 'reinvestissement'
  when 'emballage'          then 'reinvestissement'
  when 'marketing'          then 'reinvestissement'
  when 'fournitures'        then 'reinvestissement'
  when 'transport'          then 'reinvestissement'
  when 'loyer'              then 'charges'
  when 'assurance'          then 'charges'
  when 'energie'            then 'charges'
  when 'banque'             then 'charges'
  when 'taxes'              then 'charges'
  when 'salaires'           then 'personnel'
  else                           'reinvestissement'
end::public.source_fonds
where source_fonds is null;

alter table public.depenses
  alter column source_fonds set not null;

create index if not exists depenses_source_fonds_idx on public.depenses(source_fonds);

-- 3. Table paiements_depense ------------------------------------------------
create table if not exists public.paiements_depense (
  id              uuid primary key default gen_random_uuid(),
  depense_id      uuid not null references public.depenses(id) on delete cascade,
  montant         numeric(10, 2) not null check (montant > 0),
  -- date_prevue : échéance planifiée mais pas encore réglée
  -- date_effectif : date à laquelle le paiement a quitté (ou quittera) le compte
  -- Au moins une des deux doit être renseignée.
  date_prevue     date,
  date_effectif   date,
  mode            public.mode_paiement_depense not null default 'autre',
  note            text,
  saisie_par      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint paiements_depense_au_moins_une_date
    check (date_prevue is not null or date_effectif is not null)
);

comment on table public.paiements_depense is 'Paiements rattachés à une dépense (multi-échéances). 1 dépense = N paiements possibles. Cascade sur DELETE depense.';

create index if not exists paiements_depense_depense_idx
  on public.paiements_depense(depense_id);
create index if not exists paiements_depense_effectif_idx
  on public.paiements_depense(date_effectif) where date_effectif is not null;
create index if not exists paiements_depense_prevue_idx
  on public.paiements_depense(date_prevue) where date_prevue is not null and date_effectif is null;

-- 4. RLS sur paiements_depense (Patron only, comme depenses) ---------------
alter table public.paiements_depense enable row level security;

drop policy if exists paiements_depense_patron_all on public.paiements_depense;
create policy paiements_depense_patron_all on public.paiements_depense
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- 5. Migration des dépenses legacy : paiement rétrospectif automatique ----
-- Pour chaque dépense existante sans paiement rattaché, on crée un
-- paiement effectif daté de la date d'engagement (cash flow rétroactif).
insert into public.paiements_depense
  (depense_id, montant, date_effectif, mode, note, saisie_par)
select
  d.id, d.montant, d.date,
  'autre'::public.mode_paiement_depense,
  'Migration v2 — paiement rétrospectif créé automatiquement',
  d.saisie_par
from public.depenses d
where not exists (
  select 1 from public.paiements_depense p where p.depense_id = d.id
);

-- 6. Vue depenses_avec_solde -----------------------------------------------
-- Agrège pour chaque dépense : déjà payé / prévu / reste / statut.
drop view if exists public.depenses_avec_solde;
create view public.depenses_avec_solde
with (security_invoker = on)
as
with sommes as (
  select
    p.depense_id,
    sum(case when p.date_effectif is not null then p.montant else 0 end)::numeric(10, 2) as deja_paye,
    sum(case when p.date_effectif is null and p.date_prevue is not null then p.montant else 0 end)::numeric(10, 2) as prevu_non_paye,
    min(case when p.date_effectif is null and p.date_prevue is not null then p.date_prevue end) as prochaine_echeance
  from public.paiements_depense p
  group by p.depense_id
)
select
  d.id,
  d.date,
  d.montant as montant_total,
  d.categorie,
  d.source_fonds,
  d.description,
  d.justificatif_path,
  d.saisie_par,
  d.created_at,
  d.updated_at,
  coalesce(s.deja_paye, 0) as deja_paye,
  coalesce(s.prevu_non_paye, 0) as prevu,
  (d.montant - coalesce(s.deja_paye, 0))::numeric(10, 2) as reste_a_payer,
  s.prochaine_echeance,
  case
    when coalesce(s.deja_paye, 0) >= d.montant - 0.01            then 'paye'
    when coalesce(s.deja_paye, 0) > 0                            then 'partiel'
    when coalesce(s.prevu_non_paye, 0) > 0                       then 'prevu'
    else                                                              'a_payer'
  end as statut_paiement
from public.depenses d
left join sommes s on s.depense_id = d.id;

comment on view public.depenses_avec_solde is 'Dépenses avec leur solde de paiement (statut: paye / partiel / prevu / a_payer).';

-- 7. Dépenses engagées par mois (basé sur date d'engagement) ---------------
drop view if exists public.depenses_mensuelles;
drop view if exists public.depenses_engagees_mensuelles;
create view public.depenses_engagees_mensuelles
with (security_invoker = on)
as
select
  to_char(d.date, 'YYYY-MM') as mois,
  sum(d.montant)::numeric(12, 2) as engagement_total,
  count(*)::integer as nb_depenses
from public.depenses d
group by to_char(d.date, 'YYYY-MM');

-- 8. Décaissements par mois (basé sur paiement effectif) ------------------
-- Pattern aligné sur ca_mensuel : on distingue effectif (passé/aujourd'hui)
-- vs programmé (futur, ex: virement post-daté).
drop view if exists public.decaissements_mensuels;
create view public.decaissements_mensuels
with (security_invoker = on)
as
select
  to_char(p.date_effectif, 'YYYY-MM') as mois,
  sum(case when p.date_effectif <= current_date then p.montant else 0 end)::numeric(12, 2) as decaisse,
  sum(case when p.date_effectif >  current_date then p.montant else 0 end)::numeric(12, 2) as decaisse_programme,
  sum(p.montant)::numeric(12, 2) as decaisse_total,
  count(*)::integer as nb_paiements
from public.paiements_depense p
where p.date_effectif is not null
group by to_char(p.date_effectif, 'YYYY-MM');

-- 9. Échéances à venir (paiements prévus mais non payés) -------------------
drop view if exists public.echeances_a_venir;
create view public.echeances_a_venir
with (security_invoker = on)
as
select
  p.id,
  p.depense_id,
  p.montant,
  p.date_prevue,
  p.mode,
  p.note,
  d.categorie,
  d.source_fonds,
  d.description as depense_description,
  d.montant as depense_montant_total,
  case
    when p.date_prevue <  current_date                       then 'en_retard'
    when p.date_prevue <= current_date + interval '7 days'   then 'imminente'
    else                                                          'planifiee'
  end as urgence
from public.paiements_depense p
join public.depenses d on d.id = p.depense_id
where p.date_effectif is null and p.date_prevue is not null;

-- 10. Enveloppes mensuelles (alloué × consommé × solde) -------------------
-- Alloué = (CA encaissé − décaissements effectifs du mois) × pct
-- Consommé = somme des paiements effectifs du mois groupés par source
-- Solde = alloué − consommé (négatif possible = enveloppe à découvert)
--
-- Note : on utilise VALUES + ON (plutôt que UNION ALL + USING) pour
-- éviter des soucis de typage enum sur certaines versions de PG.
drop view if exists public.enveloppes_mensuelles;
create view public.enveloppes_mensuelles
with (security_invoker = on)
as
with sources(source_fonds, pct) as (
  values
    ('reinvestissement'::public.source_fonds, 0.5::numeric),
    ('charges'::public.source_fonds,         0.3::numeric),
    ('personnel'::public.source_fonds,       0.2::numeric)
),
consommes as (
  select
    to_char(p.date_effectif, 'YYYY-MM') as mois,
    d.source_fonds,
    sum(p.montant)::numeric(12, 2) as consomme
  from public.paiements_depense p
  join public.depenses d on d.id = p.depense_id
  where p.date_effectif is not null and p.date_effectif <= current_date
  group by to_char(p.date_effectif, 'YYYY-MM'), d.source_fonds
),
resultats as (
  select
    coalesce(cm.mois, dm.mois) as mois,
    greatest(0::numeric, coalesce(cm.ca_encaisse, 0) - coalesce(dm.decaisse, 0)) as resultat
  from public.ca_mensuel cm
  full outer join public.decaissements_mensuels dm on dm.mois = cm.mois
)
select
  r.mois,
  s.source_fonds,
  (r.resultat * s.pct)::numeric(12, 2) as alloue,
  coalesce(c.consomme, 0)::numeric(12, 2) as consomme,
  ((r.resultat * s.pct) - coalesce(c.consomme, 0))::numeric(12, 2) as solde
from resultats r
cross join sources s
left join consommes c on c.mois = r.mois and c.source_fonds = s.source_fonds;

comment on view public.enveloppes_mensuelles is 'Pour chaque mois et chaque enveloppe : alloué (50/30/20 du résultat), consommé (paiements effectifs imputés à la source) et solde.';

-- ============================================================
-- 0017_depenses_v2_mapping_realiste.sql
-- ============================================================
-- =============================================================================
-- Phase 5.1 — Re-cadrage du mapping catégorie → enveloppe
--
-- Suite à validation avec le patron de Bissapa, le découpage 50/30/20 est
-- finalement :
--   - Réinvestissement : matières premières + emballage uniquement
--   - Charges          : tout le reste (salaires employés, loyer, énergie,
--                        cotisations, transport véhicule, communication,
--                        logiciels, téléphone, assurance, banque, taxes…)
--   - Personnel        : enveloppe propre au patron (rémunération perso),
--                        jamais attribuée par défaut — choix manuel
--
-- Cette migration ré-impute UNIQUEMENT les dépenses qui correspondent
-- encore au DEFAULT précédent (issu de la migration 0016). Les choix
-- manuels du patron sont préservés.
-- =============================================================================

-- 1. Catégories qui basculent reinvestissement → charges
update public.depenses
set source_fonds = 'charges'::public.source_fonds
where source_fonds = 'reinvestissement'
  and categorie in ('marketing', 'fournitures', 'transport');

-- 2. Catégorie salaires : passe de personnel → charges (les salaires des
-- employés sont des charges fixes ; l'enveloppe Personnel reste pour le
-- patron uniquement)
update public.depenses
set source_fonds = 'charges'::public.source_fonds
where source_fonds = 'personnel'
  and categorie = 'salaires';

-- ============================================================
-- 0018_categories_depense_metier.sql
-- ============================================================
-- =============================================================================
-- Phase 5.2 — Catégories de dépense alignées sur la réalité métier
--
-- Le patron de Bissapa a 11 catégories métier (vs 12 catégories génériques
-- précédentes) :
--   1. matieres_premieres        → englobe sucre, fleurs, fruits, gaz prod,
--                                   eau prod, bouteilles, cartons, étiquettes,
--                                   affiches, machines
--   2. salaire_employe           → salaires + charges sociales du personnel
--   3. electricite               → énergie du local (gaz et eau de production
--                                   restent en matières premières)
--   4. cotisations_etat          → URSSAF, impôts, CFE
--   5. loyer
--   6. logiciel_facturation
--   7. telephone
--   8. transport                 → carburant, réparation véhicule
--   9. assurance                 → RC pro + assurance véhicule (séparée du transport)
--  10. marketing_communication
--  11. autres                    → fourre-tout
--
-- La conversion préserve les données existantes (mapping ancien → nouveau).
-- =============================================================================

-- 1. Drop des vues qui référencent depenses.categorie
drop view if exists public.depenses_avec_solde;
drop view if exists public.echeances_a_venir;

-- 2. Création du nouveau type ENUM
do $$ begin
  create type public.categorie_depense_v2 as enum (
    'matieres_premieres',
    'salaire_employe',
    'electricite',
    'cotisations_etat',
    'loyer',
    'logiciel_facturation',
    'telephone',
    'transport',
    'assurance',
    'marketing_communication',
    'autres'
  );
exception when duplicate_object then null; end $$;

-- 3. Conversion in-place de la colonne avec mapping ancien → nouveau
-- Postgres recrée automatiquement les index dépendants.
alter table public.depenses
  alter column categorie type public.categorie_depense_v2
  using (case categorie::text
    when 'matieres_premieres' then 'matieres_premieres'
    when 'emballage'          then 'matieres_premieres'
    when 'energie'            then 'electricite'
    when 'transport'          then 'transport'
    when 'marketing'          then 'marketing_communication'
    when 'loyer'              then 'loyer'
    when 'assurance'          then 'assurance'
    when 'banque'             then 'autres'
    when 'salaires'           then 'salaire_employe'
    when 'taxes'              then 'cotisations_etat'
    when 'fournitures'        then 'logiciel_facturation'
    when 'autre'              then 'autres'
    else                           'autres'
  end::public.categorie_depense_v2);

-- 4. Drop ancien type, renommage du nouveau pour garder le nom historique
drop type public.categorie_depense;
alter type public.categorie_depense_v2 rename to categorie_depense;

-- 5. Recréation des vues avec le nouveau type ------------------------------

create view public.depenses_avec_solde
with (security_invoker = on)
as
with sommes as (
  select
    p.depense_id,
    sum(case when p.date_effectif is not null then p.montant else 0 end)::numeric(10, 2) as deja_paye,
    sum(case when p.date_effectif is null and p.date_prevue is not null then p.montant else 0 end)::numeric(10, 2) as prevu_non_paye,
    min(case when p.date_effectif is null and p.date_prevue is not null then p.date_prevue end) as prochaine_echeance
  from public.paiements_depense p
  group by p.depense_id
)
select
  d.id,
  d.date,
  d.montant as montant_total,
  d.categorie,
  d.source_fonds,
  d.description,
  d.justificatif_path,
  d.saisie_par,
  d.created_at,
  d.updated_at,
  coalesce(s.deja_paye, 0) as deja_paye,
  coalesce(s.prevu_non_paye, 0) as prevu,
  (d.montant - coalesce(s.deja_paye, 0))::numeric(10, 2) as reste_a_payer,
  s.prochaine_echeance,
  case
    when coalesce(s.deja_paye, 0) >= d.montant - 0.01            then 'paye'
    when coalesce(s.deja_paye, 0) > 0                            then 'partiel'
    when coalesce(s.prevu_non_paye, 0) > 0                       then 'prevu'
    else                                                              'a_payer'
  end as statut_paiement
from public.depenses d
left join sommes s on s.depense_id = d.id;

create view public.echeances_a_venir
with (security_invoker = on)
as
select
  p.id,
  p.depense_id,
  p.montant,
  p.date_prevue,
  p.mode,
  p.note,
  d.categorie,
  d.source_fonds,
  d.description as depense_description,
  d.montant as depense_montant_total,
  case
    when p.date_prevue <  current_date                       then 'en_retard'
    when p.date_prevue <= current_date + interval '7 days'   then 'imminente'
    else                                                          'planifiee'
  end as urgence
from public.paiements_depense p
join public.depenses d on d.id = p.depense_id
where p.date_effectif is null and p.date_prevue is not null;

-- ============================================================
-- 0019_timezone_reunion.sql
-- ============================================================
-- =============================================================================
-- Phase 5.3 — Timezone La Réunion
--
-- Bissapa est implantée à La Réunion (UTC+4). Postgres sur Supabase tourne
-- en UTC par défaut, ce qui faisait que `current_date` était en retard de
-- jusqu'à 4 heures sur la perception locale du Patron : un paiement
-- enregistré à 22h heure locale (= 18h UTC le même jour) était OK, mais
-- enregistré à 1h du matin heure locale (= 21h UTC la veille), le système
-- considérait que `current_date` était hier et marquait le paiement comme
-- "futur". Conséquence : le dashboard affichait 0 € de décaissement alors
-- que les paiements du jour étaient bien saisis.
--
-- En réglant le timezone par défaut de la base sur 'Indian/Reunion',
-- TOUTES les fonctions temporelles (`current_date`, `now()`, etc.)
-- retournent l'heure de La Réunion, ce qui aligne automatiquement les vues
-- ca_mensuel, decaissements_mensuels, echeances_a_venir,
-- enveloppes_mensuelles et factures_avec_solde avec ce que voit le patron.
--
-- Important : la commande prend effet pour les NOUVELLES sessions. Les
-- connexions ouvertes au moment de l'application gardent leur timezone
-- jusqu'à reconnexion. Côté Supabase / PostgREST, les sessions sont
-- éphémères donc le changement est effectif dès la requête suivante.
--
-- À adapter si l'application est un jour déployée dans une autre zone
-- géographique (Europe/Paris, Africa/Dakar, etc.).
-- =============================================================================

alter database postgres set timezone to 'Indian/Reunion';

-- ============================================================
-- 0020_produit_poids.sql
-- ============================================================
-- =============================================================================
-- 0020 — Ajout du poids unitaire sur les produits
-- =============================================================================
-- Demande Patron : afficher le poids du produit sur le bon de livraison
-- (utile pour transport, manutention et calcul de tonnage cumulé d'une tournée).
--
-- Le poids est exprimé en grammes (entier) — précision suffisante pour des
-- bouteilles artisanales et plus simple à saisir qu'un décimal en kg.
--
-- La colonne reste NULLABLE pour ne pas bloquer la migration sur des produits
-- déjà créés en prod. Le formulaire (Zod) impose la saisie à chaque création
-- ou édition ultérieure, ce qui force la régularisation au fil de l'eau.
-- =============================================================================

alter table public.produits
  add column poids_grammes integer
  check (poids_grammes is null or poids_grammes > 0);

comment on column public.produits.poids_grammes is
  'Poids net unitaire en grammes (bouteille pleine). Affiché sur le bon de livraison.';

-- ============================================================
-- 0021_annulation_et_reset.sql
-- ============================================================
-- =============================================================================
-- Phase 5 — Annulation factures + RPC reset donnees operationnelles
--
-- Decisions metier :
--   1. Une facture EMISE ne peut PAS etre supprimee (obligation legale art.
--      286 CGI, conservation 10 ans). On l'ANNULE via un flag annulee_le.
--      L'annulation efface aussi les paiements lies (note metier : equivalent
--      a un avoir global).
--
--   2. Les vues finance (ca_mensuel, top_clients_mensuel, top_produits_mensuel,
--      factures_avec_solde) excluent les factures annulees pour ne pas
--      polluer le CA.
--
--   3. La RPC reset_donnees_operationnelles() permet au Patron de repartir
--      de zero sur les donnees operationnelles tout en conservant la
--      configuration (utilisateurs, clients, produits, tarifs, profils).
--      Reservee SECURITY DEFINER + check explicite du role 'patron'.
-- =============================================================================

-- 1. Colonnes annulation sur factures ----------------------------------------
alter table public.factures
  add column if not exists annulee_le timestamptz,
  add column if not exists annulee_par uuid references auth.users(id) on delete set null,
  add column if not exists motif_annulation text;

create index if not exists factures_annulee_idx
  on public.factures(annulee_le)
  where annulee_le is not null;

comment on column public.factures.annulee_le is
  'Date d annulation de la facture. Si non null, la facture est exclue des vues finance et marquee ANNULEE sur le PDF.';

-- 2. Mise a jour de la vue factures_avec_solde -------------------------------
-- Conserve la structure de 0009 (encaisse vs a_encaisser pour les cheques
-- post-dates), ajoute les flags d'annulation, change le statut a 'annulee'.
drop view if exists public.factures_avec_solde;
create view public.factures_avec_solde
with (security_invoker = on)
as
select
  f.id,
  f.livraison_id,
  f.numero,
  f.date_emission,
  f.montant_ht,
  f.pdf_url,
  f.annulee_le,
  f.annulee_par,
  f.motif_annulation,
  (f.annulee_le is not null) as est_annulee,
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement <= current_date
  ), 0)::numeric(10, 2) as montant_encaisse,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement > current_date
  ), 0)::numeric(10, 2) as montant_a_encaisser,

  greatest(
    f.montant_ht
      - coalesce((
          select sum(montant) from public.paiements where facture_id = f.id
        ), 0),
    0
  )::numeric(10, 2) as solde,

  case
    when f.annulee_le is not null then 'annulee'
    when coalesce((
      select sum(montant) from public.paiements where facture_id = f.id
    ), 0) >= f.montant_ht
      then 'paye'
    when coalesce((
      select sum(montant) from public.paiements
      where facture_id = f.id and date_encaissement <= current_date
    ), 0) > 0
      then 'partiel'
    else 'impaye'
  end as statut_paiement,

  (current_date - f.date_emission) as anciennete_jours

from public.factures f
join public.livraisons l on l.id = f.livraison_id;

-- 3. Mise a jour des vues finance pour exclure les factures annulees ---------
-- CREATE OR REPLACE car les colonnes ne changent pas (juste un join + where).
-- Necessaire pour preserver enveloppes_mensuelles (0016) qui depend de
-- ca_mensuel.
create or replace view public.ca_mensuel
with (security_invoker = on)
as
select
  to_char(p.date_encaissement, 'YYYY-MM') as mois,
  sum(case when p.date_encaissement <= current_date then p.montant else 0 end)::numeric(12, 2) as ca_encaisse,
  sum(case when p.date_encaissement > current_date then p.montant else 0 end)::numeric(12, 2) as ca_a_encaisser,
  sum(p.montant)::numeric(12, 2) as ca_total,
  count(*)::integer as nb_paiements
from public.paiements p
join public.factures f on f.id = p.facture_id
where f.annulee_le is null
group by to_char(p.date_encaissement, 'YYYY-MM');

create or replace view public.top_clients_mensuel
with (security_invoker = on)
as
select
  to_char(p.date_encaissement, 'YYYY-MM') as mois,
  l.client_id,
  c.raison_sociale,
  sum(p.montant)::numeric(12, 2) as ca,
  count(distinct l.id)::integer as nb_livraisons
from public.paiements p
join public.factures f on f.id = p.facture_id
join public.livraisons l on l.id = f.livraison_id
join public.clients c on c.id = l.client_id
where f.annulee_le is null
group by to_char(p.date_encaissement, 'YYYY-MM'), l.client_id, c.raison_sociale;

create or replace view public.top_produits_mensuel
with (security_invoker = on)
as
select
  to_char(f.date_emission, 'YYYY-MM') as mois,
  ll.produit_id,
  pr.nom as produit_nom,
  pr.gamme,
  sum(ll.qte)::integer as qte_vendue,
  sum(ll.qte * ll.prix_unitaire_ht)::numeric(12, 2) as ca_ht
from public.lignes_livraison ll
join public.livraisons l on l.id = ll.livraison_id
join public.factures f on f.livraison_id = l.id
join public.produits pr on pr.id = ll.produit_id
where f.annulee_le is null
group by to_char(f.date_emission, 'YYYY-MM'), ll.produit_id, pr.nom, pr.gamme;

-- 4. RPC : annuler une facture (Patron) --------------------------------------
-- Met le flag annulee_le, supprime les paiements lies, conserve la facture
-- pour traceabilite. La livraison liee passe a 'annulee' egalement.
create or replace function public.annuler_facture(
  p_facture_id uuid,
  p_motif text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_livraison_id uuid;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select livraison_id into v_livraison_id
  from public.factures where id = p_facture_id;

  if v_livraison_id is null then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;

  -- Supprime les paiements lies (cesse de compter dans le CA)
  delete from public.paiements where facture_id = p_facture_id;

  -- Marque la facture comme annulee
  update public.factures
     set annulee_le = now(),
         annulee_par = auth.uid(),
         motif_annulation = nullif(trim(p_motif), '')
   where id = p_facture_id;

  -- Bascule la livraison en annulee aussi (coherence)
  update public.livraisons
     set statut = 'annulee'
   where id = v_livraison_id;
end;
$$;

revoke all on function public.annuler_facture(uuid, text) from public;
grant execute on function public.annuler_facture(uuid, text) to authenticated;

-- 5. RPC : annuler une livraison non encore facturee -------------------------
-- Pour les statuts programmee/en_cours, on bascule en 'annulee' (les lots
-- ne sont reserves qu'apres allocation FIFO sur les lignes : si la livraison
-- est en brouillon, aucun mouvement de stock n'a eu lieu).
-- Pour les livraisons livree/facturee, utiliser annuler_facture() qui gere
-- la cascade complete.
create or replace function public.annuler_livraison(
  p_livraison_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_statut public.statut_livraison;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select statut into v_statut
  from public.livraisons where id = p_livraison_id;

  if v_statut is null then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;

  if v_statut = 'livree' then
    raise exception 'Cette livraison est livree : annuler la facture associee a la place.'
      using errcode = 'P0001';
  end if;

  if v_statut = 'annulee' then
    return;
  end if;

  update public.livraisons
     set statut = 'annulee'
   where id = p_livraison_id;
end;
$$;

revoke all on function public.annuler_livraison(uuid) from public;
grant execute on function public.annuler_livraison(uuid) to authenticated;

-- 6. RPC : reset des donnees operationnelles ---------------------------------
-- Vide tout sauf : profils, utilisateurs, clients, produits, tarifs, config.
-- Les sequences (numerotation factures) sont remises a zero pour repartir
-- proprement.
-- Reserve au Patron, aucune restauration possible : a confirmer cote UI par
-- saisie d'un mot-cle.
create or replace function public.reset_donnees_operationnelles()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nb_paiements bigint;
  v_nb_factures bigint;
  v_nb_lignes bigint;
  v_nb_livraisons bigint;
  v_nb_mouvements bigint;
  v_nb_lot_ing bigint;
  v_nb_lots bigint;
  v_nb_depenses bigint;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  -- Compte avant suppression pour le rapport
  select count(*) into v_nb_paiements from public.paiements;
  select count(*) into v_nb_factures from public.factures;
  select count(*) into v_nb_lignes from public.lignes_livraison;
  select count(*) into v_nb_livraisons from public.livraisons;
  select count(*) into v_nb_mouvements from public.mouvements_stock;
  select count(*) into v_nb_lot_ing from public.lot_ingredients;
  select count(*) into v_nb_lots from public.lots;
  select count(*) into v_nb_depenses from public.depenses;

  -- Ordre de suppression : depend des FK
  -- paiements -> CASCADE depuis factures, mais on supprime en premier pour clarte
  delete from public.paiements;
  delete from public.factures;
  -- lignes_livraison -> CASCADE depuis livraisons
  delete from public.lignes_livraison;
  delete from public.livraisons;
  -- mouvements_stock -> on delete restrict depuis lots, donc d'abord
  delete from public.mouvements_stock;
  -- lot_ingredients -> CASCADE depuis lots, mais explicite
  delete from public.lot_ingredients;
  delete from public.lots;
  delete from public.depenses;

  -- Reset de la sequence factures (la numerotation FAC-YYYY-00001 repart a 1)
  alter sequence public.factures_numero_seq restart with 1;

  return json_build_object(
    'paiements', v_nb_paiements,
    'factures', v_nb_factures,
    'lignes_livraison', v_nb_lignes,
    'livraisons', v_nb_livraisons,
    'mouvements_stock', v_nb_mouvements,
    'lot_ingredients', v_nb_lot_ing,
    'lots', v_nb_lots,
    'depenses', v_nb_depenses
  );
end;
$$;

revoke all on function public.reset_donnees_operationnelles() from public;
grant execute on function public.reset_donnees_operationnelles() to authenticated;

-- 7. Policy DELETE pour factures (Patron uniquement, pour les fonctions RPC)
-- Note : SECURITY DEFINER bypass deja RLS, mais on l'ajoute par coherence
-- (si jamais le code appelle un delete direct depuis l'API supabase).
drop policy if exists factures_patron_delete on public.factures;
create policy factures_patron_delete on public.factures
  for delete to authenticated
  using (public.auth_role() = 'patron');

-- 8. Policy DELETE pour mouvements_stock (Patron uniquement, via reset)
drop policy if exists mouvements_patron_delete on public.mouvements_stock;
create policy mouvements_patron_delete on public.mouvements_stock
  for delete to authenticated
  using (public.auth_role() = 'patron');

-- ============================================================
-- 0022_reset_truncate.sql
-- ============================================================
-- =============================================================================
-- Fix : reset_donnees_operationnelles() utilise TRUNCATE au lieu de DELETE
--
-- Probleme : Supabase a active une protection au niveau API qui rejette les
-- DELETE sans clause WHERE avec l'erreur :
--   "DELETE requires a WHERE clause"
-- Cette protection s'applique meme aux DELETE executes dans une fonction
-- SECURITY DEFINER, ce qui empechait la RPC reset de s'executer.
--
-- TRUNCATE :
--   - n'est pas concerne par cette protection (commande DDL, pas DML)
--   - est plus rapide qu'un DELETE sur des grosses tables
--   - reset les sequences associees a des SERIAL (pas notre cas mais propre)
--   - necessite l'option CASCADE pour traverser les FK (paiements_depense
--     est en CASCADE sur depenses, donc traite automatiquement)
-- =============================================================================

create or replace function public.reset_donnees_operationnelles()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nb_paiements bigint;
  v_nb_factures bigint;
  v_nb_lignes bigint;
  v_nb_livraisons bigint;
  v_nb_mouvements bigint;
  v_nb_lot_ing bigint;
  v_nb_lots bigint;
  v_nb_depenses bigint;
  v_nb_paiements_dep bigint;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  -- Compte avant suppression pour le rapport
  select count(*) into v_nb_paiements from public.paiements;
  select count(*) into v_nb_factures from public.factures;
  select count(*) into v_nb_lignes from public.lignes_livraison;
  select count(*) into v_nb_livraisons from public.livraisons;
  select count(*) into v_nb_mouvements from public.mouvements_stock;
  select count(*) into v_nb_lot_ing from public.lot_ingredients;
  select count(*) into v_nb_lots from public.lots;
  select count(*) into v_nb_depenses from public.depenses;
  select count(*) into v_nb_paiements_dep from public.paiements_depense;

  -- TRUNCATE en une seule commande, CASCADE pour traverser les FK
  -- (paiements_depense -> depenses, lot_ingredients -> lots, etc.)
  truncate table
    public.paiements,
    public.factures,
    public.lignes_livraison,
    public.livraisons,
    public.mouvements_stock,
    public.lot_ingredients,
    public.lots,
    public.paiements_depense,
    public.depenses
  cascade;

  -- Reset de la sequence factures (la numerotation FAC-YYYY-00001 repart a 1)
  alter sequence public.factures_numero_seq restart with 1;

  return json_build_object(
    'paiements', v_nb_paiements,
    'factures', v_nb_factures,
    'lignes_livraison', v_nb_lignes,
    'livraisons', v_nb_livraisons,
    'mouvements_stock', v_nb_mouvements,
    'lot_ingredients', v_nb_lot_ing,
    'lots', v_nb_lots,
    'depenses', v_nb_depenses,
    'paiements_depense', v_nb_paiements_dep
  );
end;
$$;

revoke all on function public.reset_donnees_operationnelles() from public;
grant execute on function public.reset_donnees_operationnelles() to authenticated;

-- ============================================================
-- 0023_numero_lot_dans_allocation.sql
-- ============================================================
-- =============================================================================
-- Modifie le trigger d'allocation FIFO pour inclure numero_lot dans le jsonb
-- lots_utilises. Decision metier : le Patron veut voir le numero de lot
-- (saisi a la production) sur les BL, factures et fiche livraison, plutot
-- que la DLUO (deja imprimee sur l'etiquette de la bouteille).
--
-- Le jsonb passe de :
--   [{"lot_id": "...", "dluo": "2026-07-01", "qte": 500}]
-- a :
--   [{"lot_id": "...", "numero_lot": "2026-W12-A", "dluo": "2026-07-01", "qte": 500}]
--
-- On garde dluo dans le jsonb pour ne rien perdre (lecture future, audit),
-- mais l'UI affichera principalement numero_lot.
--
-- Backfill : enrichit les lignes existantes en re-injectant numero_lot
-- depuis la table lots, par jointure sur lot_id.
-- =============================================================================

-- 1. Mise a jour du trigger ---------------------------------------------------
create or replace function public.allouer_lots_fifo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restant   integer := new.qte;
  v_lot       record;
  v_prise     integer;
  v_alloc     jsonb := '[]'::jsonb;
  v_dispo     integer;
begin
  -- Verifie le stock total disponible
  select coalesce(sum(qte_disponible), 0) into v_dispo
  from public.stock_par_lot
  where produit_id = new.produit_id and qte_disponible > 0;

  if v_dispo < v_restant then
    raise exception 'Stock insuffisant pour le produit % : % demandes, % disponibles',
      new.produit_id, v_restant, v_dispo
      using errcode = 'P0001';
  end if;

  -- Itere sur les lots par DLUO ascendante
  for v_lot in
    select lot_id, qte_disponible, dluo, numero_lot
    from public.stock_par_lot
    where produit_id = new.produit_id and qte_disponible > 0
    order by dluo asc, lot_id asc
  loop
    exit when v_restant <= 0;
    v_prise := least(v_lot.qte_disponible, v_restant);

    -- Cree le mouvement de stock type 'livraison'
    insert into public.mouvements_stock (lot_id, type, qte, ref_id, created_by)
    values (v_lot.lot_id, 'livraison', v_prise, new.livraison_id, auth.uid());

    -- Trace dans lots_utilises (numero_lot ajoute pour BL/facture/UI)
    v_alloc := v_alloc || jsonb_build_object(
      'lot_id', v_lot.lot_id,
      'numero_lot', v_lot.numero_lot,
      'dluo', v_lot.dluo,
      'qte', v_prise
    );

    v_restant := v_restant - v_prise;
  end loop;

  -- Persiste les allocations sur la ligne
  new.lots_utilises := v_alloc;
  return new;
end;
$$;

-- 2. Backfill des lignes existantes ------------------------------------------
-- Pour chaque ligne dont lots_utilises ne contient pas encore numero_lot,
-- on enrichit chaque entree du tableau avec le numero_lot correspondant
-- (via jointure sur la table lots). Si numero_lot est null en BDD (saisie
-- optionnelle a la production), on conserve null dans le jsonb -> l'UI
-- bascule sur le fallback (8 chars du lot_id).
update public.lignes_livraison ll
set lots_utilises = sub.enriched
from (
  select
    ll2.id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'lot_id', elem->>'lot_id',
          'numero_lot', l.numero_lot,
          'dluo', elem->>'dluo',
          'qte', (elem->>'qte')::integer
        )
        order by ord
      ),
      '[]'::jsonb
    ) as enriched
  from public.lignes_livraison ll2,
       jsonb_array_elements(ll2.lots_utilises) with ordinality as t(elem, ord)
  left join public.lots l on l.id = (elem->>'lot_id')::uuid
  where ll2.lots_utilises is not null
    and jsonb_typeof(ll2.lots_utilises) = 'array'
    and jsonb_array_length(ll2.lots_utilises) > 0
    -- ne re-traite pas les lignes deja enrichies
    and not (ll2.lots_utilises->0 ? 'numero_lot')
  group by ll2.id
) sub
where ll.id = sub.id;

-- ============================================================
-- 0024_restaurer_stock_annulation.sql
-- ============================================================
-- =============================================================================
-- Restauration du stock a l'annulation/suppression d'une livraison BROUILLON
--
-- Probleme : le trigger allouer_lots_fifo cree des mouvements_stock
-- type='livraison' a la creation des lignes. Quand on annulait ou
-- supprimait une livraison brouillon (programmee/en_cours, jamais livree
-- physiquement), ces mouvements restaient en base et le stock dispo
-- continuait a etre decremente a tort.
--
-- Decision metier :
--   - livraison BROUILLON (programmee/en_cours) annulee/supprimee : la
--     marchandise n'est PAS sortie de l'entrepot, on doit donc supprimer
--     les mouvements_stock pour que le stock dispo remonte. C'est ce que
--     fait cette migration via la RPC annuler_livraison + une RPC
--     supprimer_livraison_brouillon dediee.
--
--   - livraison LIVREE puis facturee, puis facture annulee : la marchandise
--     est physiquement chez le client. On ne touche PAS aux mouvements
--     (gere par annuler_facture - migration 0021). Si le client retourne
--     la marchandise, le Patron saisit un ajustement manuel.
--
-- Cette migration met aussi a jour annuler_livraison() pour nettoyer les
-- mouvements et ajoute supprimer_livraison_brouillon() (RPC, evite de faire
-- 2 DELETE separes cote client).
-- =============================================================================

-- 1. RPC annuler_livraison : nettoie les mouvements de stock --------------
create or replace function public.annuler_livraison(
  p_livraison_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_statut public.statut_livraison;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select statut into v_statut
  from public.livraisons where id = p_livraison_id;

  if v_statut is null then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;

  if v_statut = 'livree' then
    raise exception 'Cette livraison est livree : annuler la facture associee a la place.'
      using errcode = 'P0001';
  end if;

  if v_statut = 'annulee' then
    return;
  end if;

  -- Restauration du stock : la marchandise n'a jamais quitte l'entrepot.
  -- Les mouvements crees par le trigger allouer_lots_fifo sont effaces.
  delete from public.mouvements_stock
  where ref_id = p_livraison_id and type = 'livraison';

  update public.livraisons
     set statut = 'annulee'
   where id = p_livraison_id;
end;
$$;

revoke all on function public.annuler_livraison(uuid) from public;
grant execute on function public.annuler_livraison(uuid) to authenticated;

-- 2. RPC supprimer_livraison_brouillon -----------------------------------
-- Combine en une seule transaction la suppression des mouvements puis de
-- la livraison (qui cascade les lignes). Bloque si une facture est
-- rattachee (FK ON DELETE RESTRICT le ferait de toute facon, mais le
-- message d'erreur est plus clair ici).
create or replace function public.supprimer_livraison_brouillon(
  p_livraison_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_a_facture boolean;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.factures where livraison_id = p_livraison_id
  ) into v_a_facture;

  if v_a_facture then
    raise exception 'Une facture est rattachee a cette livraison : annule la facture a la place.'
      using errcode = 'P0001';
  end if;

  -- Restaure le stock
  delete from public.mouvements_stock
  where ref_id = p_livraison_id and type = 'livraison';

  -- Supprime la livraison (cascade lignes_livraison)
  delete from public.livraisons where id = p_livraison_id;
end;
$$;

revoke all on function public.supprimer_livraison_brouillon(uuid) from public;
grant execute on function public.supprimer_livraison_brouillon(uuid) to authenticated;

-- ============================================================
-- 0025_consolider_policies_livraisons.sql
-- ============================================================
-- =============================================================================
-- Consolidation des policies RLS livraisons + lignes_livraison
--
-- Probleme observe : un compte Adjoint correctement enregistre en BDD
-- (profiles.role = 'adjoint', actif = true) recoit l'erreur
--   "new row violates row-level security policy for table livraisons"
-- au moment d'inserer une livraison, alors que :
--   - public.auth_role() retourne bien 'adjoint' pour cette session
--   - la policy livraisons_adjoint_insert existe bien
--   - elle dit `with check (auth_role() = 'adjoint')` ce qui devrait passer
--
-- Diagnostic : multiples policies INSERT separees par role + valeur
-- 'adjoint' ajoutee tardivement a l'enum role_utilisateur via ALTER TYPE
-- ADD VALUE => Postgres rejete l'INSERT meme si une policy aurait du
-- valider (probablement un probleme de cache de plan ou de comparaison
-- d'enum).
--
-- Solution : consolider toutes les policies INSERT/UPDATE en une seule
-- policy par action, qui liste tous les roles autorises. Plus simple,
-- plus robuste, plus rapide pour le planner.
--
-- Le DELETE reste reserve au Patron (suppression definitive).
-- Les regles metier specifiques (Livreur ne peut updater que ses
-- propres livraisons) restent dans des policies separees additives.
-- =============================================================================

-- 1. Livraisons : INSERT operationnel pour patron / adjoint / fab / livreur
drop policy if exists livraisons_patron_fab_insert on public.livraisons;
drop policy if exists livraisons_adjoint_insert on public.livraisons;
drop policy if exists livraisons_livreur_insert on public.livraisons;

create policy livraisons_insert_operationnel on public.livraisons
  for insert to authenticated
  with check (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 2. Livraisons : UPDATE operationnel
-- Patron + Adjoint + Fabrication peuvent updater toute livraison.
-- Livreur uniquement sur SES propres livraisons (regle conservee dans
-- une policy distincte additive plus bas).
drop policy if exists livraisons_patron_update on public.livraisons;
drop policy if exists livraisons_adjoint_update on public.livraisons;
drop policy if exists livraisons_fab_update on public.livraisons;

create policy livraisons_update_operationnel on public.livraisons
  for update to authenticated
  using (public.auth_role() in ('patron', 'adjoint', 'fabrication'))
  with check (public.auth_role() in ('patron', 'adjoint', 'fabrication'));

-- Livreur peut updater uniquement ses livraisons (statut, signature,
-- date_livraison) - policy additive (logique OR avec la precedente)
drop policy if exists livraisons_livreur_update_propre on public.livraisons;
create policy livraisons_livreur_update_propre on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'livreur' and livreur_id = auth.uid())
  with check (public.auth_role() = 'livreur' and livreur_id = auth.uid());

-- 3. Lignes_livraison : INSERT operationnel
drop policy if exists lignes_patron_fab_insert on public.lignes_livraison;
drop policy if exists lignes_adjoint_insert on public.lignes_livraison;
drop policy if exists lignes_livreur_insert on public.lignes_livraison;

create policy lignes_livraison_insert_operationnel on public.lignes_livraison
  for insert to authenticated
  with check (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 4. Lignes_livraison : UPDATE
drop policy if exists lignes_patron_update on public.lignes_livraison;
drop policy if exists lignes_adjoint_update on public.lignes_livraison;

create policy lignes_livraison_update_operationnel on public.lignes_livraison
  for update to authenticated
  using (public.auth_role() in ('patron', 'adjoint'))
  with check (public.auth_role() in ('patron', 'adjoint'));

-- 5. Lignes_livraison : DELETE (Patron + Adjoint, evite cascade orpheline)
drop policy if exists lignes_patron_delete on public.lignes_livraison;
drop policy if exists lignes_adjoint_delete on public.lignes_livraison;

create policy lignes_livraison_delete_operationnel on public.lignes_livraison
  for delete to authenticated
  using (public.auth_role() in ('patron', 'adjoint'));

-- ============================================================
-- 0026_adjoint_select_policies.sql
-- ============================================================
-- =============================================================================
-- Ajout de l'Adjoint aux policies SELECT manquantes
--
-- Bug observe : un Adjoint correctement enregistre en BDD ne pouvait pas
-- creer de livraison. Apres diagnostic on s'est apercu que :
--   - la policy INSERT autorisait bien l'Adjoint
--   - mais .insert(...).select("id") plante car le SELECT post-INSERT
--     ne trouve aucune policy SELECT qui valide pour l'Adjoint
--   - PostgreSQL renvoie alors l'erreur trompeuse
--     "new row violates row-level security policy"
--
-- Cause : la migration 0010 (ajout du role adjoint) a ajoute des policies
-- INSERT/UPDATE pour l'Adjoint mais a oublie d'etendre les policies
-- SELECT existantes (livraisons_select, lignes_select, factures_select,
-- paiements_select, lots_select_authenticated, mouvements_select).
--
-- Pour clients et tarifs_clients, c'est OK : clients_adjoint_all et
-- tarifs_adjoint_all sont des policies FOR ALL qui couvrent aussi SELECT.
--
-- Migration idempotente (drop + create).
-- =============================================================================

-- 1. Livraisons
drop policy if exists livraisons_select on public.livraisons;
create policy livraisons_select on public.livraisons
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 2. Lignes_livraison
drop policy if exists lignes_select on public.lignes_livraison;
create policy lignes_select on public.lignes_livraison
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 3. Factures (Adjoint = Patron par interim, doit voir les factures)
drop policy if exists factures_select on public.factures;
create policy factures_select on public.factures
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'livreur')
  );

-- 4. Paiements
drop policy if exists paiements_select on public.paiements;
create policy paiements_select on public.paiements
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'livreur')
  );

-- 5. Lots (Adjoint doit voir le stock pour les decisions metier)
drop policy if exists lots_select_authenticated on public.lots;
create policy lots_select_authenticated on public.lots
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 6. Mouvements_stock
drop policy if exists mouvements_select_authenticated on public.mouvements_stock;
create policy mouvements_select_authenticated on public.mouvements_stock
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 7. Paiements_insert : verifier aussi (Adjoint doit pouvoir encaisser)
drop policy if exists paiements_insert on public.paiements;
create policy paiements_insert on public.paiements
  for insert to authenticated
  with check (
    public.auth_role() in ('patron', 'adjoint', 'livreur')
  );

-- ============================================================
-- 0027_adjoint_depenses_policies.sql
-- ============================================================
-- =============================================================================
-- Acces Adjoint aux depenses (Reinvestissement + Charges uniquement cote app)
--
-- Contexte : depuis la refonte du role Adjoint (= Patron par interim),
-- l'Adjoint doit pouvoir saisir des depenses imputees aux enveloppes
-- Reinvestissement et Charges. L'enveloppe Personnel reste reservee au Patron.
--
-- La restriction sur la source_fonds est faite cote application
-- (sourcesAccessiblesPour, voir lib/domain/source-fonds.ts) :
-- l'UI ne propose pas Personnel a l'Adjoint, le serveur le rejette aussi.
--
-- Cote RLS, on donne SELECT/INSERT/UPDATE a l'Adjoint sur depenses,
-- paiements_depense et le bucket Storage 'justificatifs'.
-- DELETE reste reserve au Patron (effacement definitif d'un justificatif
-- comptable).
--
-- Migration idempotente.
-- =============================================================================

-- 1. depenses : Adjoint = SELECT/INSERT/UPDATE
drop policy if exists depenses_adjoint_select on public.depenses;
create policy depenses_adjoint_select on public.depenses
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists depenses_adjoint_insert on public.depenses;
create policy depenses_adjoint_insert on public.depenses
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists depenses_adjoint_update on public.depenses;
create policy depenses_adjoint_update on public.depenses
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- 2. paiements_depense : Adjoint = SELECT/INSERT/UPDATE
drop policy if exists paiements_depense_adjoint_select on public.paiements_depense;
create policy paiements_depense_adjoint_select on public.paiements_depense
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists paiements_depense_adjoint_insert on public.paiements_depense;
create policy paiements_depense_adjoint_insert on public.paiements_depense
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists paiements_depense_adjoint_update on public.paiements_depense;
create policy paiements_depense_adjoint_update on public.paiements_depense
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- 3. Storage : bucket 'justificatifs' (Adjoint peut deposer et consulter)
drop policy if exists justificatifs_adjoint_select on storage.objects;
create policy justificatifs_adjoint_select on storage.objects
  for select to authenticated
  using (bucket_id = 'justificatifs' and public.auth_role() = 'adjoint');

drop policy if exists justificatifs_adjoint_insert on storage.objects;
create policy justificatifs_adjoint_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'justificatifs' and public.auth_role() = 'adjoint');

-- ============================================================
-- 0028_systeme_consigne.sql
-- ============================================================
-- =============================================================================
-- Systeme de consigne (Bissapa)
--
-- Le Patron applique une consigne sur chaque bouteille / flacon vendu
-- (0,05 EUR par defaut). Quand un client rend des bouteilles vides, on
-- deduit la consigne du montant a payer sur la facture en cours.
--
-- Choix d'implementation :
--   1. Tarif configurable via une table singleton 'parametres_entreprise'
--      (le Patron peut l'ajuster sans deploiement).
--   2. Pas de suivi des consignes en circulation par client : on deduit
--      simplement au moment de marquer la livraison 'livree'.
--   3. La facture stocke deux montants :
--        - montant_ht       : total des lignes (inchange)
--        - montant_consigne : credit applique (= nb * tarif)
--      Le client doit payer (montant_ht - montant_consigne).
--
-- Migration idempotente.
-- =============================================================================

-- 1. Table parametres_entreprise (singleton) ---------------------------------
create table if not exists public.parametres_entreprise (
  id                  boolean primary key default true check (id),
  tarif_consigne_eur  numeric(6, 2) not null default 0.05
    check (tarif_consigne_eur >= 0),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users(id)
);

comment on table public.parametres_entreprise is
  'Parametres globaux de l entreprise (singleton, une seule row identifiee par id=true).';
comment on column public.parametres_entreprise.tarif_consigne_eur is
  'Montant credite par bouteille / flacon rendu vide par le client.';

-- Insere la row unique si pas encore presente
insert into public.parametres_entreprise (id)
values (true)
on conflict (id) do nothing;

-- Trigger touch updated_at
drop trigger if exists parametres_entreprise_touch on public.parametres_entreprise;
create trigger parametres_entreprise_touch
  before update on public.parametres_entreprise
  for each row execute function public.touch_updated_at();

-- RLS : tous les authentifies peuvent lire (le tarif est utile pour le calcul
-- cote app), seul le Patron peut modifier.
alter table public.parametres_entreprise enable row level security;

drop policy if exists parametres_select on public.parametres_entreprise;
create policy parametres_select on public.parametres_entreprise
  for select to authenticated using (true);

drop policy if exists parametres_patron_update on public.parametres_entreprise;
create policy parametres_patron_update on public.parametres_entreprise
  for update to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- 2. Colonne nb_consignes_recuperees sur livraisons --------------------------
alter table public.livraisons
  add column if not exists nb_consignes_recuperees integer not null default 0
    check (nb_consignes_recuperees >= 0);

comment on column public.livraisons.nb_consignes_recuperees is
  'Nombre de bouteilles / flacons vides rapportes par le client lors de cette livraison. Saisi au moment de marquer livree, ouvre droit a un credit consigne sur la facture.';

-- 3. Colonne montant_consigne sur factures -----------------------------------
alter table public.factures
  add column if not exists montant_consigne numeric(10, 2) not null default 0
    check (montant_consigne >= 0);

comment on column public.factures.montant_consigne is
  'Credit consigne applique a la facture (= nb_consignes_recuperees x tarif_consigne_eur). Le client paie (montant_ht - montant_consigne).';

-- 4. Mise a jour du trigger creer_facture_si_livree --------------------------
-- Le trigger lit maintenant nb_consignes_recuperees + tarif_consigne_eur
-- et stocke le credit dans la facture.
create or replace function public.creer_facture_si_livree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_montant   numeric(10, 2);
  v_consigne  numeric(10, 2);
  v_tarif     numeric(6, 2);
  v_numero    text;
  v_year      text := to_char(now(), 'YYYY');
  v_seq       bigint;
begin
  -- Ne s'applique qu'a la transition vers 'livree'
  if new.statut <> 'livree' or old.statut = 'livree' then
    return new;
  end if;

  -- Empeche le double si une facture existe deja
  if exists (select 1 from public.factures where livraison_id = new.id) then
    return new;
  end if;

  -- Calcule le montant total HT
  select coalesce(sum(qte * prix_unitaire_ht), 0)
    into v_montant
  from public.lignes_livraison
  where livraison_id = new.id;

  if v_montant = 0 then
    raise exception 'Impossible de facturer une livraison sans ligne ou a 0 EUR.'
      using errcode = 'P0001';
  end if;

  -- Calcule le credit consigne (lit le tarif courant)
  select coalesce(tarif_consigne_eur, 0.05)
    into v_tarif
  from public.parametres_entreprise
  where id = true;

  v_consigne := round(coalesce(new.nb_consignes_recuperees, 0) * v_tarif, 2);

  -- Le credit ne peut pas depasser le montant HT (sinon facture negative)
  if v_consigne > v_montant then
    v_consigne := v_montant;
  end if;

  -- Genere le numero FAC-YYYY-NNNNN (5 chiffres, padding zero)
  v_seq := nextval('public.factures_numero_seq');
  v_numero := 'FAC-' || v_year || '-' || lpad(v_seq::text, 5, '0');

  -- Pose la date de livraison si pas encore fait
  if new.date_livraison is null then
    new.date_livraison := now();
  end if;

  insert into public.factures (
    livraison_id, numero, date_emission, montant_ht, montant_consigne
  )
  values (
    new.id, v_numero, current_date, v_montant, v_consigne
  );

  return new;
end;
$$;

-- 5. Mise a jour de la vue factures_avec_solde -------------------------------
-- Le solde et le statut_paiement sont desormais calcules sur le
-- montant_du = montant_ht - montant_consigne.
drop view if exists public.factures_avec_solde;
create view public.factures_avec_solde
with (security_invoker = on)
as
select
  f.id,
  f.livraison_id,
  f.numero,
  f.date_emission,
  f.montant_ht,
  f.montant_consigne,
  (f.montant_ht - f.montant_consigne)::numeric(10, 2) as montant_du,
  f.pdf_url,
  f.annulee_le,
  f.annulee_par,
  f.motif_annulation,
  (f.annulee_le is not null) as est_annulee,
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,
  l.nb_consignes_recuperees,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement <= current_date
  ), 0)::numeric(10, 2) as montant_encaisse,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement > current_date
  ), 0)::numeric(10, 2) as montant_a_encaisser,

  greatest(
    (f.montant_ht - f.montant_consigne)
      - coalesce((
          select sum(montant) from public.paiements where facture_id = f.id
        ), 0),
    0
  )::numeric(10, 2) as solde,

  case
    when f.annulee_le is not null then 'annulee'
    when coalesce((
      select sum(montant) from public.paiements where facture_id = f.id
    ), 0) >= (f.montant_ht - f.montant_consigne)
      then 'paye'
    when coalesce((
      select sum(montant) from public.paiements
      where facture_id = f.id and date_encaissement <= current_date
    ), 0) > 0
      then 'partiel'
    else 'impaye'
  end as statut_paiement,

  (current_date - f.date_emission) as anciennete_jours

from public.factures f
join public.livraisons l on l.id = f.livraison_id;

comment on view public.factures_avec_solde is
  'Factures avec solde et statut. montant_du = montant_ht - montant_consigne ; le solde est calcule sur ce montant_du.';

-- ============================================================
-- 0029_livraison_heure_prevue.sql
-- ============================================================
-- =============================================================================
-- Heure prevue optionnelle sur les livraisons
--
-- Le Patron veut pouvoir indiquer l'heure prevue pour les livraisons qui
-- ont un creneau precis (typique sur la tournee : "14h chez Carrefour").
-- L'heure n'est PAS obligatoire : les livraisons sans creneau precis
-- restent valides.
--
-- Choix : colonne separee `heure_prevue time` plutot que conversion de
-- `date_prevue` en timestamptz. Plus simple, additif, ne casse aucune
-- requete existante (filtre par jour, agregations mensuelles, etc.).
--
-- Migration idempotente.
-- =============================================================================

alter table public.livraisons
  add column if not exists heure_prevue time;

comment on column public.livraisons.heure_prevue is
  'Heure prevue optionnelle (HH:MM) pour les livraisons avec creneau precis. NULL = pas de creneau impose.';
