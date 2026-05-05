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
