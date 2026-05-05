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
