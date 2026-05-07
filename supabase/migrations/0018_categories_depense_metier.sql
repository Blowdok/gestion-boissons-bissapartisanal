-- =============================================================================
-- Phase 5.2 — Catégories de dépense alignées sur la réalité métier
--
-- Le patron de Bissapa a 11 catégories métier (vs 12 catégories génériques
-- précédentes) :
--   1. matieres_premieres        → englobe sucre, fleurs, fruits, gaz prod,
--                                   eau prod, bouteilles, cartons, étiquettes,
--                                   affiches, machines
--   2. salaire_employe           → salaires + charges sociales du personnel
--   3. electricite               → énergie du local (gaz et eau de production
--                                   restent en matières premières)
--   4. cotisations_etat          → URSSAF, impôts, CFE
--   5. loyer
--   6. logiciel_facturation
--   7. telephone
--   8. transport                 → carburant, réparation véhicule
--   9. assurance                 → RC pro + assurance véhicule (séparée du transport)
--  10. marketing_communication
--  11. autres                    → fourre-tout
--
-- La conversion préserve les données existantes (mapping ancien → nouveau).
-- =============================================================================

-- 1. Drop des vues qui référencent depenses.categorie
drop view if exists public.depenses_avec_solde;
drop view if exists public.echeances_a_venir;

-- 2. Création du nouveau type ENUM
do $$ begin
  create type public.categorie_depense_v2 as enum (
    'matieres_premieres',
    'salaire_employe',
    'electricite',
    'cotisations_etat',
    'loyer',
    'logiciel_facturation',
    'telephone',
    'transport',
    'assurance',
    'marketing_communication',
    'autres'
  );
exception when duplicate_object then null; end $$;

-- 3. Conversion in-place de la colonne avec mapping ancien → nouveau
-- Postgres recrée automatiquement les index dépendants.
alter table public.depenses
  alter column categorie type public.categorie_depense_v2
  using (case categorie::text
    when 'matieres_premieres' then 'matieres_premieres'
    when 'emballage'          then 'matieres_premieres'
    when 'energie'            then 'electricite'
    when 'transport'          then 'transport'
    when 'marketing'          then 'marketing_communication'
    when 'loyer'              then 'loyer'
    when 'assurance'          then 'assurance'
    when 'banque'             then 'autres'
    when 'salaires'           then 'salaire_employe'
    when 'taxes'              then 'cotisations_etat'
    when 'fournitures'        then 'logiciel_facturation'
    when 'autre'              then 'autres'
    else                           'autres'
  end::public.categorie_depense_v2);

-- 4. Drop ancien type, renommage du nouveau pour garder le nom historique
drop type public.categorie_depense;
alter type public.categorie_depense_v2 rename to categorie_depense;

-- 5. Recréation des vues avec le nouveau type ------------------------------

create view public.depenses_avec_solde
with (security_invoker = on)
as
with sommes as (
  select
    p.depense_id,
    sum(case when p.date_effectif is not null then p.montant else 0 end)::numeric(10, 2) as deja_paye,
    sum(case when p.date_effectif is null and p.date_prevue is not null then p.montant else 0 end)::numeric(10, 2) as prevu_non_paye,
    min(case when p.date_effectif is null and p.date_prevue is not null then p.date_prevue end) as prochaine_echeance
  from public.paiements_depense p
  group by p.depense_id
)
select
  d.id,
  d.date,
  d.montant as montant_total,
  d.categorie,
  d.source_fonds,
  d.description,
  d.justificatif_path,
  d.saisie_par,
  d.created_at,
  d.updated_at,
  coalesce(s.deja_paye, 0) as deja_paye,
  coalesce(s.prevu_non_paye, 0) as prevu,
  (d.montant - coalesce(s.deja_paye, 0))::numeric(10, 2) as reste_a_payer,
  s.prochaine_echeance,
  case
    when coalesce(s.deja_paye, 0) >= d.montant - 0.01            then 'paye'
    when coalesce(s.deja_paye, 0) > 0                            then 'partiel'
    when coalesce(s.prevu_non_paye, 0) > 0                       then 'prevu'
    else                                                              'a_payer'
  end as statut_paiement
from public.depenses d
left join sommes s on s.depense_id = d.id;

create view public.echeances_a_venir
with (security_invoker = on)
as
select
  p.id,
  p.depense_id,
  p.montant,
  p.date_prevue,
  p.mode,
  p.note,
  d.categorie,
  d.source_fonds,
  d.description as depense_description,
  d.montant as depense_montant_total,
  case
    when p.date_prevue <  current_date                       then 'en_retard'
    when p.date_prevue <= current_date + interval '7 days'   then 'imminente'
    else                                                          'planifiee'
  end as urgence
from public.paiements_depense p
join public.depenses d on d.id = p.depense_id
where p.date_effectif is null and p.date_prevue is not null;
