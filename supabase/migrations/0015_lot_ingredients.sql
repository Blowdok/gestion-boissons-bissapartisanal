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
