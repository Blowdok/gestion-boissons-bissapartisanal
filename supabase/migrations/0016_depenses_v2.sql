-- =============================================================================
-- Phase 5 — Dépenses V2
--   - Enveloppes : chaque dépense est rattachée à une source de fonds
--     (reinvestissement / charges / personnel) — calque du 50/30/20.
--   - Paiements multi-échéances : une dépense peut être réglée en N
--     paiements (date prévue et/ou date effective). Permet de gérer les
--     fournisseurs en plusieurs fois ou les dettes ouvertes sans date.
--
-- Données legacy : pour chaque dépense existante on crée AUTOMATIQUEMENT
-- un paiement rétrospectif (date_effectif = ancienne date, mode = 'autre',
-- note "Migration v2") afin que le passé reste cohérent.
--
-- Vues remplacées :
--   - depenses_mensuelles  →  depenses_engagees_mensuelles + decaissements_mensuels
--                             (engagement vs cash-flow)
--   + nouvelles vues : depenses_avec_solde, echeances_a_venir, enveloppes_mensuelles
-- =============================================================================

-- 1. ENUMs ------------------------------------------------------------------
do $$ begin
  create type public.source_fonds as enum ('reinvestissement', 'charges', 'personnel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mode_paiement_depense as enum (
    'especes', 'virement', 'cheque', 'prelevement', 'carte', 'autre'
  );
exception when duplicate_object then null; end $$;

-- 2. Colonnes ajoutées sur depenses ----------------------------------------
-- Note : on garde la colonne `date` (= date d'engagement de la dépense),
-- aucun renommage pour ne pas casser les requêtes existantes.
alter table public.depenses
  add column if not exists source_fonds public.source_fonds;

comment on column public.depenses.date is 'Date d''engagement de la dépense (commande / facture fournisseur). Les paiements réels sont dans paiements_depense.';
comment on column public.depenses.montant is 'Montant total engagé de la dépense (somme attendue des paiements_depense).';
comment on column public.depenses.source_fonds is 'Enveloppe budgétaire à laquelle la dépense est imputée (réinvestissement / charges / personnel). Pré-rempli depuis la catégorie côté UI.';

-- Backfill : mapping catégorie → source par défaut
update public.depenses
set source_fonds = case categorie
  when 'matieres_premieres' then 'reinvestissement'
  when 'emballage'          then 'reinvestissement'
  when 'marketing'          then 'reinvestissement'
  when 'fournitures'        then 'reinvestissement'
  when 'transport'          then 'reinvestissement'
  when 'loyer'              then 'charges'
  when 'assurance'          then 'charges'
  when 'energie'            then 'charges'
  when 'banque'             then 'charges'
  when 'taxes'              then 'charges'
  when 'salaires'           then 'personnel'
  else                           'reinvestissement'
end::public.source_fonds
where source_fonds is null;

alter table public.depenses
  alter column source_fonds set not null;

create index if not exists depenses_source_fonds_idx on public.depenses(source_fonds);

-- 3. Table paiements_depense ------------------------------------------------
create table if not exists public.paiements_depense (
  id              uuid primary key default gen_random_uuid(),
  depense_id      uuid not null references public.depenses(id) on delete cascade,
  montant         numeric(10, 2) not null check (montant > 0),
  -- date_prevue : échéance planifiée mais pas encore réglée
  -- date_effectif : date à laquelle le paiement a quitté (ou quittera) le compte
  -- Au moins une des deux doit être renseignée.
  date_prevue     date,
  date_effectif   date,
  mode            public.mode_paiement_depense not null default 'autre',
  note            text,
  saisie_par      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint paiements_depense_au_moins_une_date
    check (date_prevue is not null or date_effectif is not null)
);

comment on table public.paiements_depense is 'Paiements rattachés à une dépense (multi-échéances). 1 dépense = N paiements possibles. Cascade sur DELETE depense.';

create index if not exists paiements_depense_depense_idx
  on public.paiements_depense(depense_id);
create index if not exists paiements_depense_effectif_idx
  on public.paiements_depense(date_effectif) where date_effectif is not null;
create index if not exists paiements_depense_prevue_idx
  on public.paiements_depense(date_prevue) where date_prevue is not null and date_effectif is null;

-- 4. RLS sur paiements_depense (Patron only, comme depenses) ---------------
alter table public.paiements_depense enable row level security;

drop policy if exists paiements_depense_patron_all on public.paiements_depense;
create policy paiements_depense_patron_all on public.paiements_depense
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- 5. Migration des dépenses legacy : paiement rétrospectif automatique ----
-- Pour chaque dépense existante sans paiement rattaché, on crée un
-- paiement effectif daté de la date d'engagement (cash flow rétroactif).
insert into public.paiements_depense
  (depense_id, montant, date_effectif, mode, note, saisie_par)
select
  d.id, d.montant, d.date,
  'autre'::public.mode_paiement_depense,
  'Migration v2 — paiement rétrospectif créé automatiquement',
  d.saisie_par
from public.depenses d
where not exists (
  select 1 from public.paiements_depense p where p.depense_id = d.id
);

-- 6. Vue depenses_avec_solde -----------------------------------------------
-- Agrège pour chaque dépense : déjà payé / prévu / reste / statut.
drop view if exists public.depenses_avec_solde;
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

comment on view public.depenses_avec_solde is 'Dépenses avec leur solde de paiement (statut: paye / partiel / prevu / a_payer).';

-- 7. Dépenses engagées par mois (basé sur date d'engagement) ---------------
drop view if exists public.depenses_mensuelles;
drop view if exists public.depenses_engagees_mensuelles;
create view public.depenses_engagees_mensuelles
with (security_invoker = on)
as
select
  to_char(d.date, 'YYYY-MM') as mois,
  sum(d.montant)::numeric(12, 2) as engagement_total,
  count(*)::integer as nb_depenses
from public.depenses d
group by to_char(d.date, 'YYYY-MM');

-- 8. Décaissements par mois (basé sur paiement effectif) ------------------
-- Pattern aligné sur ca_mensuel : on distingue effectif (passé/aujourd'hui)
-- vs programmé (futur, ex: virement post-daté).
drop view if exists public.decaissements_mensuels;
create view public.decaissements_mensuels
with (security_invoker = on)
as
select
  to_char(p.date_effectif, 'YYYY-MM') as mois,
  sum(case when p.date_effectif <= current_date then p.montant else 0 end)::numeric(12, 2) as decaisse,
  sum(case when p.date_effectif >  current_date then p.montant else 0 end)::numeric(12, 2) as decaisse_programme,
  sum(p.montant)::numeric(12, 2) as decaisse_total,
  count(*)::integer as nb_paiements
from public.paiements_depense p
where p.date_effectif is not null
group by to_char(p.date_effectif, 'YYYY-MM');

-- 9. Échéances à venir (paiements prévus mais non payés) -------------------
drop view if exists public.echeances_a_venir;
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

-- 10. Enveloppes mensuelles (alloué × consommé × solde) -------------------
-- Alloué = (CA encaissé − décaissements effectifs du mois) × pct
-- Consommé = somme des paiements effectifs du mois groupés par source
-- Solde = alloué − consommé (négatif possible = enveloppe à découvert)
drop view if exists public.enveloppes_mensuelles;
create view public.enveloppes_mensuelles
with (security_invoker = on)
as
with sources as (
  select 'reinvestissement'::public.source_fonds as source_fonds, 0.5::numeric as pct
  union all select 'charges'::public.source_fonds,         0.3::numeric
  union all select 'personnel'::public.source_fonds,       0.2::numeric
),
consommes as (
  select
    to_char(p.date_effectif, 'YYYY-MM') as mois,
    d.source_fonds,
    sum(p.montant)::numeric(12, 2) as consomme
  from public.paiements_depense p
  join public.depenses d on d.id = p.depense_id
  where p.date_effectif is not null and p.date_effectif <= current_date
  group by to_char(p.date_effectif, 'YYYY-MM'), d.source_fonds
),
resultats as (
  select
    coalesce(cm.mois, dm.mois) as mois,
    greatest(0, coalesce(cm.ca_encaisse, 0) - coalesce(dm.decaisse, 0)) as resultat
  from public.ca_mensuel cm
  full outer join public.decaissements_mensuels dm using (mois)
)
select
  r.mois,
  s.source_fonds,
  (r.resultat * s.pct)::numeric(12, 2) as alloue,
  coalesce(c.consomme, 0)::numeric(12, 2) as consomme,
  ((r.resultat * s.pct) - coalesce(c.consomme, 0))::numeric(12, 2) as solde
from resultats r
cross join sources s
left join consommes c on c.mois = r.mois and c.source_fonds = s.source_fonds;

comment on view public.enveloppes_mensuelles is 'Pour chaque mois et chaque enveloppe : alloué (50/30/20 du résultat), consommé (paiements effectifs imputés à la source) et solde.';
