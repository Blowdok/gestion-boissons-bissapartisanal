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
