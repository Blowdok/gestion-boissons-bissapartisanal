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
