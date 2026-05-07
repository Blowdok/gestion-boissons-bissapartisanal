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
