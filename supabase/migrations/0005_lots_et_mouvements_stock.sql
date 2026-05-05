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
