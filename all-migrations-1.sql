-- ============================================================
-- Le Bissap Artisanal - Migrations consolidees (V1)
-- A executer en une seule fois dans le SQL Editor de Supabase
-- juste apres la creation du projet de production.
-- Toutes les migrations sont idempotentes.
-- ============================================================


-- ============================================================
-- 0001_init.sql
-- ============================================================
-- =============================================================================
-- Phase 1 — Schema initial : profiles, parfums, clients, tarifs_clients
-- + helpers d'autorisation (auth_role) + politiques RLS par role
-- =============================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- Type ENUM des roles ------------------------------------------------------
do $$ begin
  create type public.role_utilisateur as enum ('patron', 'fabrication', 'livreur');
exception when duplicate_object then null; end $$;

-- Table profiles -----------------------------------------------------------
-- Chaque ligne miroir d'un auth.users avec un role et un nom affichable.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nom         text not null,
  role        public.role_utilisateur not null,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role) where actif;

-- Helper auth_role() -------------------------------------------------------
-- Renvoie le role du user connecte, ou NULL s'il n'a pas de profil actif.
-- security definer + search_path verrouille pour eviter une attaque via le path.
create or replace function public.auth_role()
returns public.role_utilisateur
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and actif = true
  limit 1;
$$;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;

-- Trigger updated_at -------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Table parfums ------------------------------------------------------------
create table if not exists public.parfums (
  id              uuid primary key default gen_random_uuid(),
  nom             text not null unique,
  seuil_alerte    integer not null default 50 check (seuil_alerte >= 0),
  prix_defaut_ht  numeric(10, 2) not null check (prix_defaut_ht >= 0),
  actif           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists parfums_actif_idx on public.parfums(actif);

drop trigger if exists parfums_touch_updated on public.parfums;
create trigger parfums_touch_updated
  before update on public.parfums
  for each row execute function public.touch_updated_at();

-- Table clients (B2B) ------------------------------------------------------
create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  raison_sociale        text not null,
  contact               text,
  email                 citext,
  telephone             text,
  adresse               text,
  ville                 text,
  code_postal           text,
  siret                 text,
  conditions_paiement   text,
  notes                 text,
  actif                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists clients_raison_sociale_idx
  on public.clients using gin (raison_sociale gin_trgm_ops);
create index if not exists clients_ville_idx on public.clients(ville);
create index if not exists clients_actif_idx on public.clients(actif);

drop trigger if exists clients_touch_updated on public.clients;
create trigger clients_touch_updated
  before update on public.clients
  for each row execute function public.touch_updated_at();

-- Table tarifs_clients (prix negocies par parfum) --------------------------
create table if not exists public.tarifs_clients (
  client_id    uuid not null references public.clients(id) on delete cascade,
  parfum_id    uuid not null references public.parfums(id) on delete cascade,
  prix_ht      numeric(10, 2) not null check (prix_ht >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (client_id, parfum_id)
);

drop trigger if exists tarifs_clients_touch_updated on public.tarifs_clients;
create trigger tarifs_clients_touch_updated
  before update on public.tarifs_clients
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Trigger : provisionne automatiquement un profil a la creation d'un user
-- via l'API admin (raw_user_meta_data contient nom + role)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nom, role, actif)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.role_utilisateur, 'livreur'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- profiles -----------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'patron');

drop policy if exists profiles_patron_all on public.profiles;
create policy profiles_patron_all on public.profiles
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- parfums ------------------------------------------------------------------
alter table public.parfums enable row level security;

drop policy if exists parfums_select_authenticated on public.parfums;
create policy parfums_select_authenticated on public.parfums
  for select to authenticated
  using (true);

drop policy if exists parfums_patron_write on public.parfums;
create policy parfums_patron_write on public.parfums
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- clients ------------------------------------------------------------------
alter table public.clients enable row level security;

drop policy if exists clients_select_authenticated on public.clients;
create policy clients_select_authenticated on public.clients
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists clients_patron_write on public.clients;
create policy clients_patron_write on public.clients
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- tarifs_clients -----------------------------------------------------------
alter table public.tarifs_clients enable row level security;

drop policy if exists tarifs_select_authenticated on public.tarifs_clients;
create policy tarifs_select_authenticated on public.tarifs_clients
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists tarifs_patron_write on public.tarifs_clients;
create policy tarifs_patron_write on public.tarifs_clients
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- =============================================================================
-- Note pour la suite
-- =============================================================================
-- Les profils des utilisateurs de test seront crees via l'API admin Supabase
-- (script scripts/seed-users.mjs) plutot qu'en SQL pur, car cela necessite
-- de creer les comptes auth.users en passant par le service de signup.

-- ============================================================
-- 0002_gamme_format_parfums.sql
-- ============================================================
-- =============================================================================
-- Phase 1 (suite) — Ajout des colonnes `gamme` et `format` sur parfums
-- pour distinguer la gamme Bissapa (bouteilles) de Zandjabila (shots 60ml)
-- =============================================================================

-- ENUM pour la gamme commerciale
do $$ begin
  create type public.gamme_produit as enum ('bissapa', 'zandjabila');
exception when duplicate_object then null; end $$;

alter table public.parfums
  add column if not exists gamme   public.gamme_produit not null default 'bissapa',
  add column if not exists format  text not null default '25cl';

-- Sur les lignes existantes (s'il y en a deja), on garde le defaut Bissapa.
-- Quand le seed re-tournera, les Zandjabila seront poses avec leur gamme propre.

-- Pas de RLS a ajuster : les politiques actuelles (select pour authenticated,
-- write pour patron) couvrent automatiquement les nouvelles colonnes.

-- ============================================================
-- 0003_clients_unique.sql
-- ============================================================
-- =============================================================================
-- Phase 1 (suite) — Contrainte UNIQUE sur clients.raison_sociale
-- pour rendre le seed.sql veritablement idempotent.
-- =============================================================================

-- Si des doublons existent, ils doivent etre nettoyes prealablement
-- (cf. scripts/cleanup-clients-duplicates.mjs).
alter table public.clients
  add constraint clients_raison_sociale_unique unique (raison_sociale);

-- ============================================================
-- 0004_rename_parfums_to_produits.sql
-- ============================================================
-- =============================================================================
-- Phase 1 (suite) — Renomme parfums -> produits + prix reels Bissapa/Zandjabila
-- =============================================================================

-- Renommage de la table principale -----------------------------------------
alter table public.parfums rename to produits;

-- Renommage du trigger updated_at
alter trigger parfums_touch_updated on public.produits
  rename to produits_touch_updated;

-- Renommage de l'index sur actif
alter index if exists public.parfums_actif_idx rename to produits_actif_idx;

-- Renommage des policies RLS
alter policy parfums_select_authenticated on public.produits
  rename to produits_select_authenticated;
alter policy parfums_patron_write on public.produits
  rename to produits_patron_write;

-- Renommage de la colonne FK dans tarifs_clients ---------------------------
alter table public.tarifs_clients
  rename column parfum_id to produit_id;

-- Prix reels (Bissapa = 25cl, Zandjabila = 60ml) ---------------------------
update public.produits set prix_defaut_ht = 1.20
  where nom in (
    'Bissap Nature',
    'Bissap Passion',
    'Bissap Framboise',
    'Ananas & Coco',
    'Bissap Melon',
    'Bissap Litchi'
  );

update public.produits set prix_defaut_ht = 1.25
  where nom = 'Bissap Menthe';

update public.produits set prix_defaut_ht = 1.35
  where nom = 'Ananas & Gingembre';

update public.produits set prix_defaut_ht = 1.80
  where nom in ('GingerShot Ananas', 'GingerShot Citron');

-- ============================================================
-- 0005_lots_et_mouvements_stock.sql
-- ============================================================
-- =============================================================================
-- Phase 2 — Stock & Production
-- Tables : lots (production) et mouvements_stock (historique)
-- Vues   : stock_par_lot et stock_par_produit (security_invoker pour RLS)
-- Trigger: auto-creation mouvement type='production' a l'insert d'un lot
-- =============================================================================

-- ENUM des types de mouvement -----------------------------------------------
do $$ begin
  create type public.type_mouvement as enum ('production', 'livraison', 'perte', 'ajustement');
exception when duplicate_object then null; end $$;

-- ENUM des motifs de perte ---------------------------------------------------
do $$ begin
  create type public.motif_perte as enum ('casse', 'peremption', 'retour_client', 'autre');
exception when duplicate_object then null; end $$;

-- Table lots ----------------------------------------------------------------
create table if not exists public.lots (
  id              uuid primary key default gen_random_uuid(),
  produit_id      uuid not null references public.produits(id) on delete restrict,
  numero_lot      text,
  date_production date not null default current_date,
  dluo            date not null,
  qte_produite    integer not null check (qte_produite > 0),
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint lots_dluo_apres_production check (dluo >= date_production)
);

create index if not exists lots_produit_idx on public.lots(produit_id);
create index if not exists lots_dluo_idx on public.lots(dluo);
create index if not exists lots_date_production_idx on public.lots(date_production desc);

drop trigger if exists lots_touch_updated on public.lots;
create trigger lots_touch_updated
  before update on public.lots
  for each row execute function public.touch_updated_at();

-- Table mouvements_stock -----------------------------------------------------
create table if not exists public.mouvements_stock (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.lots(id) on delete restrict,
  type        public.type_mouvement not null,
  qte         integer not null check (qte > 0),
  motif       public.motif_perte,
  ref_id      uuid,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Le motif n'a de sens que pour les pertes
  constraint mvt_motif_si_perte check (
    (type = 'perte' and motif is not null)
    or (type <> 'perte' and motif is null)
  )
);

create index if not exists mouvements_lot_idx on public.mouvements_stock(lot_id);
create index if not exists mouvements_type_idx on public.mouvements_stock(type);
create index if not exists mouvements_created_at_idx on public.mouvements_stock(created_at desc);

-- Trigger : a l'insert d'un lot, cree automatiquement le mouvement 'production'
create or replace function public.handle_lot_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mouvements_stock (lot_id, type, qte, created_by)
  values (new.id, 'production', new.qte_produite, new.created_by);
  return new;
end;
$$;

drop trigger if exists on_lot_created on public.lots;
create trigger on_lot_created
  after insert on public.lots
  for each row execute function public.handle_lot_creation();

-- Vue stock par lot ---------------------------------------------------------
-- security_invoker = on : la vue respecte la RLS du caller (PG 15+).
create or replace view public.stock_par_lot
with (security_invoker = on)
as
select
  l.id              as lot_id,
  l.produit_id,
  l.numero_lot,
  l.date_production,
  l.dluo,
  l.qte_produite,
  coalesce((
    select sum(qte) from public.mouvements_stock
    where lot_id = l.id and type = 'livraison'
  ), 0)::integer as qte_livree,
  coalesce((
    select sum(qte) from public.mouvements_stock
    where lot_id = l.id and type = 'perte'
  ), 0)::integer as qte_perdue,
  (l.qte_produite
    - coalesce((
        select sum(qte) from public.mouvements_stock
        where lot_id = l.id and type = 'livraison'
      ), 0)
    - coalesce((
        select sum(qte) from public.mouvements_stock
        where lot_id = l.id and type = 'perte'
      ), 0)
  )::integer as qte_disponible,
  (l.dluo < current_date) as dluo_passee
from public.lots l;

-- Vue stock par produit (somme des lots non DLUO) ---------------------------
create or replace view public.stock_par_produit
with (security_invoker = on)
as
select
  p.id              as produit_id,
  p.nom,
  p.gamme,
  p.format,
  p.seuil_alerte,
  p.actif,
  coalesce(sum(case when not s.dluo_passee then s.qte_disponible else 0 end), 0)::integer
    as qte_disponible,
  coalesce(sum(case when s.dluo_passee then s.qte_disponible else 0 end), 0)::integer
    as qte_dluo_passee,
  count(case when s.qte_disponible > 0 and not s.dluo_passee then 1 end)::integer
    as nb_lots_actifs
from public.produits p
left join public.stock_par_lot s on s.produit_id = p.id
group by p.id, p.nom, p.gamme, p.format, p.seuil_alerte, p.actif;

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- lots : Patron + Fabrication peuvent CRUD, Livreur lecture seule
alter table public.lots enable row level security;

drop policy if exists lots_select_authenticated on public.lots;
create policy lots_select_authenticated on public.lots
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists lots_patron_fab_write on public.lots;
create policy lots_patron_fab_write on public.lots
  for all to authenticated
  using (public.auth_role() in ('patron', 'fabrication'))
  with check (public.auth_role() in ('patron', 'fabrication'));

-- mouvements_stock : meme logique
alter table public.mouvements_stock enable row level security;

drop policy if exists mouvements_select_authenticated on public.mouvements_stock;
create policy mouvements_select_authenticated on public.mouvements_stock
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists mouvements_patron_fab_insert on public.mouvements_stock;
create policy mouvements_patron_fab_insert on public.mouvements_stock
  for insert to authenticated
  with check (public.auth_role() in ('patron', 'fabrication'));

-- Pas de UPDATE/DELETE sur mouvements_stock : c'est un journal append-only.
-- Pour corriger une erreur, on cree un mouvement 'ajustement' compensatoire.

-- ============================================================
-- 0006_livraisons_factures.sql
-- ============================================================
-- =============================================================================
-- Phase 3 — Livraisons & Facturation
-- Tables : livraisons, lignes_livraison, factures, paiements
-- Triggers : FIFO sur lignes_livraison, creation auto facture quand livree
-- Numerotation : FAC-YYYY-NNNNN via sequence
-- =============================================================================

-- ENUMs --------------------------------------------------------------------
do $$ begin
  create type public.statut_livraison as enum ('programmee', 'en_cours', 'livree', 'annulee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mode_paiement as enum ('especes', 'virement', 'cheque', 'carte');
exception when duplicate_object then null; end $$;

-- Sequence pour la numerotation des factures (NNNNN reset annuel via fonction)
create sequence if not exists public.factures_numero_seq start 1;

-- Table livraisons ----------------------------------------------------------
create table if not exists public.livraisons (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete restrict,
  date_prevue     date not null default current_date,
  date_livraison  timestamptz,
  statut          public.statut_livraison not null default 'programmee',
  livreur_id      uuid references auth.users(id) on delete set null,
  signature_url   text,
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists livraisons_client_idx on public.livraisons(client_id);
create index if not exists livraisons_statut_idx on public.livraisons(statut);
create index if not exists livraisons_date_prevue_idx on public.livraisons(date_prevue);
create index if not exists livraisons_livreur_idx on public.livraisons(livreur_id);

drop trigger if exists livraisons_touch_updated on public.livraisons;
create trigger livraisons_touch_updated
  before update on public.livraisons
  for each row execute function public.touch_updated_at();

-- Table lignes_livraison ----------------------------------------------------
create table if not exists public.lignes_livraison (
  id                uuid primary key default gen_random_uuid(),
  livraison_id      uuid not null references public.livraisons(id) on delete cascade,
  produit_id        uuid not null references public.produits(id) on delete restrict,
  qte               integer not null check (qte > 0),
  prix_unitaire_ht  numeric(10, 2) not null check (prix_unitaire_ht >= 0),
  lots_utilises     jsonb,
  created_at        timestamptz not null default now(),
  unique (livraison_id, produit_id)
);

create index if not exists lignes_livraison_livraison_idx on public.lignes_livraison(livraison_id);
create index if not exists lignes_livraison_produit_idx on public.lignes_livraison(produit_id);

-- Table factures ------------------------------------------------------------
create table if not exists public.factures (
  id              uuid primary key default gen_random_uuid(),
  livraison_id    uuid not null unique references public.livraisons(id) on delete restrict,
  numero          text not null unique,
  date_emission   date not null default current_date,
  montant_ht      numeric(10, 2) not null check (montant_ht >= 0),
  pdf_url         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists factures_date_idx on public.factures(date_emission desc);

drop trigger if exists factures_touch_updated on public.factures;
create trigger factures_touch_updated
  before update on public.factures
  for each row execute function public.touch_updated_at();

-- Table paiements -----------------------------------------------------------
create table if not exists public.paiements (
  id                  uuid primary key default gen_random_uuid(),
  facture_id          uuid not null references public.factures(id) on delete cascade,
  montant             numeric(10, 2) not null check (montant > 0),
  mode                public.mode_paiement not null,
  date_encaissement   date not null default current_date,
  encaisse_par        uuid references auth.users(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists paiements_facture_idx on public.paiements(facture_id);
create index if not exists paiements_date_idx on public.paiements(date_encaissement desc);

-- =============================================================================
-- Trigger FIFO sur insert lignes_livraison
-- Selectionne les lots du produit ordonnes par DLUO ascendante,
-- alloue les quantites, ecrit dans mouvements_stock type='livraison',
-- stocke les lots utilises dans lots_utilises (jsonb).
-- =============================================================================
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
    select lot_id, qte_disponible, dluo
    from public.stock_par_lot
    where produit_id = new.produit_id and qte_disponible > 0
    order by dluo asc, lot_id asc
  loop
    exit when v_restant <= 0;
    v_prise := least(v_lot.qte_disponible, v_restant);

    -- Cree le mouvement de stock type 'livraison'
    insert into public.mouvements_stock (lot_id, type, qte, ref_id, created_by)
    values (v_lot.lot_id, 'livraison', v_prise, new.livraison_id, auth.uid());

    -- Trace dans lots_utilises
    v_alloc := v_alloc || jsonb_build_object(
      'lot_id', v_lot.lot_id,
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

drop trigger if exists on_ligne_livraison_insert on public.lignes_livraison;
create trigger on_ligne_livraison_insert
  before insert on public.lignes_livraison
  for each row execute function public.allouer_lots_fifo();

-- =============================================================================
-- Trigger : creation automatique de facture quand statut passe a 'livree'
-- =============================================================================
create or replace function public.creer_facture_si_livree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_montant numeric(10, 2);
  v_numero  text;
  v_year    text := to_char(now(), 'YYYY');
  v_seq     bigint;
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

  -- Genere le numero FAC-YYYY-NNNNN (5 chiffres, padding zero)
  v_seq := nextval('public.factures_numero_seq');
  v_numero := 'FAC-' || v_year || '-' || lpad(v_seq::text, 5, '0');

  -- Pose la date de livraison si pas encore fait
  if new.date_livraison is null then
    new.date_livraison := now();
  end if;

  insert into public.factures (livraison_id, numero, date_emission, montant_ht)
  values (new.id, v_numero, current_date, v_montant);

  return new;
end;
$$;

drop trigger if exists on_livraison_livree on public.livraisons;
create trigger on_livraison_livree
  before update on public.livraisons
  for each row execute function public.creer_facture_si_livree();

-- =============================================================================
-- Vue factures avec solde (paye / impaye / partiel)
-- =============================================================================
create or replace view public.factures_avec_solde
with (security_invoker = on)
as
select
  f.id,
  f.livraison_id,
  f.numero,
  f.date_emission,
  f.montant_ht,
  f.pdf_url,
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,
  coalesce((
    select sum(montant)
    from public.paiements
    where facture_id = f.id
  ), 0)::numeric(10, 2) as montant_paye,
  (f.montant_ht - coalesce((
    select sum(montant)
    from public.paiements
    where facture_id = f.id
  ), 0))::numeric(10, 2) as solde,
  case
    when coalesce((
      select sum(montant)
      from public.paiements
      where facture_id = f.id
    ), 0) >= f.montant_ht then 'paye'
    when coalesce((
      select sum(montant)
      from public.paiements
      where facture_id = f.id
    ), 0) > 0 then 'partiel'
    else 'impaye'
  end as statut_paiement,
  (current_date - f.date_emission) as anciennete_jours
from public.factures f
join public.livraisons l on l.id = f.livraison_id;

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- livraisons : lecture pour tous, ecriture Patron+Fabrication, transitions Livreur sur ses livraisons
alter table public.livraisons enable row level security;

drop policy if exists livraisons_select on public.livraisons;
create policy livraisons_select on public.livraisons
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists livraisons_patron_fab_insert on public.livraisons;
create policy livraisons_patron_fab_insert on public.livraisons
  for insert to authenticated
  with check (public.auth_role() in ('patron', 'fabrication'));

drop policy if exists livraisons_patron_update on public.livraisons;
create policy livraisons_patron_update on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'patron');

-- Le Livreur peut updater sa propre livraison (statut + signature_url + date_livraison)
drop policy if exists livraisons_livreur_update_propre on public.livraisons;
create policy livraisons_livreur_update_propre on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'livreur' and livreur_id = auth.uid())
  with check (public.auth_role() = 'livreur' and livreur_id = auth.uid());

-- Fabrication peut updater (mais pas supprimer) une livraison qu'elle a creee
drop policy if exists livraisons_fab_update on public.livraisons;
create policy livraisons_fab_update on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'fabrication')
  with check (public.auth_role() = 'fabrication');

drop policy if exists livraisons_patron_delete on public.livraisons;
create policy livraisons_patron_delete on public.livraisons
  for delete to authenticated
  using (public.auth_role() = 'patron');

-- lignes_livraison : meme logique que livraisons
alter table public.lignes_livraison enable row level security;

drop policy if exists lignes_select on public.lignes_livraison;
create policy lignes_select on public.lignes_livraison
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists lignes_patron_fab_insert on public.lignes_livraison;
create policy lignes_patron_fab_insert on public.lignes_livraison
  for insert to authenticated
  with check (public.auth_role() in ('patron', 'fabrication'));

drop policy if exists lignes_patron_update on public.lignes_livraison;
create policy lignes_patron_update on public.lignes_livraison
  for update to authenticated
  using (public.auth_role() = 'patron');

drop policy if exists lignes_patron_delete on public.lignes_livraison;
create policy lignes_patron_delete on public.lignes_livraison
  for delete to authenticated
  using (public.auth_role() = 'patron');

-- factures : lecture Patron+Livreur, creation auto par trigger
alter table public.factures enable row level security;

drop policy if exists factures_select on public.factures;
create policy factures_select on public.factures
  for select to authenticated
  using (public.auth_role() in ('patron', 'livreur'));

drop policy if exists factures_patron_update on public.factures;
create policy factures_patron_update on public.factures
  for update to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- paiements : Patron+Livreur peuvent encaisser
alter table public.paiements enable row level security;

drop policy if exists paiements_select on public.paiements;
create policy paiements_select on public.paiements
  for select to authenticated
  using (public.auth_role() in ('patron', 'livreur'));

drop policy if exists paiements_insert on public.paiements;
create policy paiements_insert on public.paiements
  for insert to authenticated
  with check (public.auth_role() in ('patron', 'livreur'));

drop policy if exists paiements_patron_update on public.paiements;
create policy paiements_patron_update on public.paiements
  for update to authenticated
  using (public.auth_role() = 'patron');

drop policy if exists paiements_patron_delete on public.paiements;
create policy paiements_patron_delete on public.paiements
  for delete to authenticated
  using (public.auth_role() = 'patron');

-- ============================================================
-- 0007_livreur_delete_paiement_24h.sql
-- ============================================================
-- =============================================================================
-- Phase 3 (suite) — Permettre au Livreur de supprimer ses propres paiements
-- pendant les 24h apres creation (correction d'une faute de frappe).
-- Au-dela, seul le Patron peut intervenir.
-- =============================================================================

drop policy if exists paiements_livreur_delete_recent on public.paiements;
create policy paiements_livreur_delete_recent on public.paiements
  for delete to authenticated
  using (
    public.auth_role() = 'livreur'
    and encaisse_par = auth.uid()
    and created_at > (now() - interval '24 hours')
  );

-- Note : la policy 'paiements_patron_delete' existe deja pour le Patron
-- (voir 0006). Les deux policies sont OR, donc le Patron garde son acces complet.

-- ============================================================
-- 0008_claim_livraison.sql
-- ============================================================
-- =============================================================================
-- Phase 3 (suite) — Permettre au Livreur de "prendre" une livraison non
-- assignee (livreur_id IS NULL) en cliquant un bouton dans sa tournee.
--
-- Implemente via une fonction SECURITY DEFINER plutot qu'une policy RLS,
-- car cela permet de restreindre l'update a la SEULE colonne livreur_id
-- et de garantir que la livraison etait bien libre (race condition safe).
-- =============================================================================

create or replace function public.claim_livraison(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.role_utilisateur;
begin
  v_role := public.auth_role();

  if v_role is null then
    raise exception 'Non authentifie.' using errcode = '42501';
  end if;

  if v_role <> 'livreur' then
    raise exception 'Reserve aux livreurs.' using errcode = '42501';
  end if;

  -- Update conditionnel : ne fait rien si la livraison est deja assignee
  -- ou pas dans un statut compatible. La condition livreur_id IS NULL
  -- evite la race entre deux livreurs qui cliqueraient simultanement.
  update public.livraisons
  set livreur_id = auth.uid()
  where id = p_id
    and livreur_id is null
    and statut in ('programmee', 'en_cours');

  if not found then
    raise exception 'Livraison deja prise par un autre livreur ou non disponible.'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.claim_livraison(uuid) from public;
grant execute on function public.claim_livraison(uuid) to authenticated;

-- ============================================================
-- 0009_paiements_futurs.sql
-- ============================================================
-- =============================================================================
-- Phase 3 (suite) — Distinguer paiements effectifs vs paiements promis
-- (cheques post-dates, virements programmes, etc.)
--
-- - montant_encaisse  : sum paiements ou date_encaissement <= today
-- - montant_a_encaisser : sum paiements ou date_encaissement > today
-- - solde : montant_ht - encaisse - a_encaisser
-- - statut_paiement :
--    'paye'    si encaisse + a_encaisser >= montant_ht
--    'partiel' si encaisse > 0 ET solde > 0
--    'impaye'  si encaisse = 0
-- =============================================================================

-- DROP + CREATE car CREATE OR REPLACE refuse de renommer une colonne
-- existante (montant_paye -> montant_encaisse + ajout montant_a_encaisser)
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
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,

  -- Paiements effectifs (deja encaisses)
  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement <= current_date
  ), 0)::numeric(10, 2) as montant_encaisse,

  -- Paiements promis (cheques post-dates, etc.)
  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement > current_date
  ), 0)::numeric(10, 2) as montant_a_encaisser,

  -- Solde restant a recouvrer (rien encaisse ni promis)
  greatest(
    f.montant_ht
      - coalesce((
          select sum(montant) from public.paiements where facture_id = f.id
        ), 0),
    0
  )::numeric(10, 2) as solde,

  -- Statut paiement
  case
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

-- ============================================================
-- 0010_role_adjoint.sql
-- ============================================================
-- =============================================================================
-- Phase 3 (suite) — Nouveau rôle 'adjoint'
-- L'Adjoint est un Patron temporaire avec droits élargis sur l'opérationnel
-- mais SANS accès finance, suppression définitive d'utilisateurs, ni promotion
-- vers Patron/Adjoint.
--
-- ⚠ APPLIQUER EN 2 ÉTAPES si on passe par le SQL Editor (Postgres refuse
-- d'utiliser une nouvelle valeur d'enum dans la même transaction où elle est
-- créée — erreur 55P04). Avec `supabase db push`, chaque migration est sa
-- propre transaction donc OK.
-- =============================================================================

-- 1. Ajout de la valeur 'adjoint' à l'enum role_utilisateur
-- ⚠ Sur SQL Editor : exécuter SEULE cette ligne d'abord, puis le reste du fichier
alter type public.role_utilisateur add value if not exists 'adjoint' before 'fabrication';
