-- =============================================================================
-- Phase 1 (suite) — Contrainte UNIQUE sur clients.raison_sociale
-- pour rendre le seed.sql veritablement idempotent.
-- =============================================================================

-- Si des doublons existent, ils doivent etre nettoyes prealablement
-- (cf. scripts/cleanup-clients-duplicates.mjs).
alter table public.clients
  add constraint clients_raison_sociale_unique unique (raison_sociale);
