-- =============================================================================
-- Phase 3 (suite) — Distinguer paiements effectifs vs paiements promis
-- (cheques post-dates, virements programmes, etc.)
--
-- - montant_encaisse  : sum paiements ou date_encaissement <= today
-- - montant_a_encaisser : sum paiements ou date_encaissement > today
-- - solde : montant_ht - encaisse - a_encaisser
-- - statut_paiement :
--    'paye'    si encaisse + a_encaisser >= montant_ht
--    'partiel' si encaisse > 0 ET solde > 0
--    'impaye'  si encaisse = 0
-- =============================================================================

create or replace view public.factures_avec_solde
with (security_invoker = on)
as
select
  f.id,
  f.livraison_id,
  f.numero,
  f.date_emission,
  f.montant_ht,
  f.pdf_url,
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,

  -- Paiements effectifs (deja encaisses)
  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement <= current_date
  ), 0)::numeric(10, 2) as montant_encaisse,

  -- Paiements promis (cheques post-dates, etc.)
  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement > current_date
  ), 0)::numeric(10, 2) as montant_a_encaisser,

  -- Solde restant a recouvrer (rien encaisse ni promis)
  greatest(
    f.montant_ht
      - coalesce((
          select sum(montant) from public.paiements where facture_id = f.id
        ), 0),
    0
  )::numeric(10, 2) as solde,

  -- Statut paiement
  case
    when coalesce((
      select sum(montant) from public.paiements where facture_id = f.id
    ), 0) >= f.montant_ht
      then 'paye'
    when coalesce((
      select sum(montant) from public.paiements
      where facture_id = f.id and date_encaissement <= current_date
    ), 0) > 0
      then 'partiel'
    else 'impaye'
  end as statut_paiement,

  (current_date - f.date_emission) as anciennete_jours

from public.factures f
join public.livraisons l on l.id = f.livraison_id;
