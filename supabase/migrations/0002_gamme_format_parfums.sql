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
