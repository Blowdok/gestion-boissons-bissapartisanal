-- =============================================================================
-- Phase 5 — Annulation factures + RPC reset donnees operationnelles
--
-- Decisions metier :
--   1. Une facture EMISE ne peut PAS etre supprimee (obligation legale art.
--      286 CGI, conservation 10 ans). On l'ANNULE via un flag annulee_le.
--      L'annulation efface aussi les paiements lies (note metier : equivalent
--      a un avoir global).
--
--   2. Les vues finance (ca_mensuel, top_clients_mensuel, top_produits_mensuel,
--      factures_avec_solde) excluent les factures annulees pour ne pas
--      polluer le CA.
--
--   3. La RPC reset_donnees_operationnelles() permet au Patron de repartir
--      de zero sur les donnees operationnelles tout en conservant la
--      configuration (utilisateurs, clients, produits, tarifs, profils).
--      Reservee SECURITY DEFINER + check explicite du role 'patron'.
-- =============================================================================

-- 1. Colonnes annulation sur factures ----------------------------------------
alter table public.factures
  add column if not exists annulee_le timestamptz,
  add column if not exists annulee_par uuid references auth.users(id) on delete set null,
  add column if not exists motif_annulation text;

create index if not exists factures_annulee_idx
  on public.factures(annulee_le)
  where annulee_le is not null;

comment on column public.factures.annulee_le is
  'Date d annulation de la facture. Si non null, la facture est exclue des vues finance et marquee ANNULEE sur le PDF.';

-- 2. Mise a jour de la vue factures_avec_solde -------------------------------
-- Conserve la structure de 0009 (encaisse vs a_encaisser pour les cheques
-- post-dates), ajoute les flags d'annulation, change le statut a 'annulee'.
drop view if exists public.factures_avec_solde;
create view public.factures_avec_solde
with (security_invoker = on)
as
select
  f.id,
  f.livraison_id,
  f.numero,
  f.date_emission,
  f.montant_ht,
  f.pdf_url,
  f.annulee_le,
  f.annulee_par,
  f.motif_annulation,
  (f.annulee_le is not null) as est_annulee,
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement <= current_date
  ), 0)::numeric(10, 2) as montant_encaisse,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement > current_date
  ), 0)::numeric(10, 2) as montant_a_encaisser,

  greatest(
    f.montant_ht
      - coalesce((
          select sum(montant) from public.paiements where facture_id = f.id
        ), 0),
    0
  )::numeric(10, 2) as solde,

  case
    when f.annulee_le is not null then 'annulee'
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

-- 3. Mise a jour des vues finance pour exclure les factures annulees ---------
drop view if exists public.ca_mensuel;
create view public.ca_mensuel
with (security_invoker = on)
as
select
  to_char(p.date_encaissement, 'YYYY-MM') as mois,
  sum(case when p.date_encaissement <= current_date then p.montant else 0 end)::numeric(12, 2) as ca_encaisse,
  sum(case when p.date_encaissement > current_date then p.montant else 0 end)::numeric(12, 2) as ca_a_encaisser,
  sum(p.montant)::numeric(12, 2) as ca_total,
  count(*)::integer as nb_paiements
from public.paiements p
join public.factures f on f.id = p.facture_id
where f.annulee_le is null
group by to_char(p.date_encaissement, 'YYYY-MM');

drop view if exists public.top_clients_mensuel;
create view public.top_clients_mensuel
with (security_invoker = on)
as
select
  to_char(p.date_encaissement, 'YYYY-MM') as mois,
  l.client_id,
  c.raison_sociale,
  sum(p.montant)::numeric(12, 2) as ca,
  count(distinct l.id)::integer as nb_livraisons
from public.paiements p
join public.factures f on f.id = p.facture_id
join public.livraisons l on l.id = f.livraison_id
join public.clients c on c.id = l.client_id
where f.annulee_le is null
group by to_char(p.date_encaissement, 'YYYY-MM'), l.client_id, c.raison_sociale;

drop view if exists public.top_produits_mensuel;
create view public.top_produits_mensuel
with (security_invoker = on)
as
select
  to_char(f.date_emission, 'YYYY-MM') as mois,
  ll.produit_id,
  pr.nom as produit_nom,
  pr.gamme,
  sum(ll.qte)::integer as qte_vendue,
  sum(ll.qte * ll.prix_unitaire_ht)::numeric(12, 2) as ca_ht
from public.lignes_livraison ll
join public.livraisons l on l.id = ll.livraison_id
join public.factures f on f.livraison_id = l.id
join public.produits pr on pr.id = ll.produit_id
where f.annulee_le is null
group by to_char(f.date_emission, 'YYYY-MM'), ll.produit_id, pr.nom, pr.gamme;

-- 4. RPC : annuler une facture (Patron) --------------------------------------
-- Met le flag annulee_le, supprime les paiements lies, conserve la facture
-- pour traceabilite. La livraison liee passe a 'annulee' egalement.
create or replace function public.annuler_facture(
  p_facture_id uuid,
  p_motif text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_livraison_id uuid;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select livraison_id into v_livraison_id
  from public.factures where id = p_facture_id;

  if v_livraison_id is null then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;

  -- Supprime les paiements lies (cesse de compter dans le CA)
  delete from public.paiements where facture_id = p_facture_id;

  -- Marque la facture comme annulee
  update public.factures
     set annulee_le = now(),
         annulee_par = auth.uid(),
         motif_annulation = nullif(trim(p_motif), '')
   where id = p_facture_id;

  -- Bascule la livraison en annulee aussi (coherence)
  update public.livraisons
     set statut = 'annulee'
   where id = v_livraison_id;
end;
$$;

revoke all on function public.annuler_facture(uuid, text) from public;
grant execute on function public.annuler_facture(uuid, text) to authenticated;

-- 5. RPC : annuler une livraison non encore facturee -------------------------
-- Pour les statuts programmee/en_cours, on bascule en 'annulee' (les lots
-- ne sont reserves qu'apres allocation FIFO sur les lignes : si la livraison
-- est en brouillon, aucun mouvement de stock n'a eu lieu).
-- Pour les livraisons livree/facturee, utiliser annuler_facture() qui gere
-- la cascade complete.
create or replace function public.annuler_livraison(
  p_livraison_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_statut public.statut_livraison;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select statut into v_statut
  from public.livraisons where id = p_livraison_id;

  if v_statut is null then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;

  if v_statut = 'livree' then
    raise exception 'Cette livraison est livree : annuler la facture associee a la place.'
      using errcode = 'P0001';
  end if;

  if v_statut = 'annulee' then
    return;
  end if;

  update public.livraisons
     set statut = 'annulee'
   where id = p_livraison_id;
end;
$$;

revoke all on function public.annuler_livraison(uuid) from public;
grant execute on function public.annuler_livraison(uuid) to authenticated;

-- 6. RPC : reset des donnees operationnelles ---------------------------------
-- Vide tout sauf : profils, utilisateurs, clients, produits, tarifs, config.
-- Les sequences (numerotation factures) sont remises a zero pour repartir
-- proprement.
-- Reserve au Patron, aucune restauration possible : a confirmer cote UI par
-- saisie d'un mot-cle.
create or replace function public.reset_donnees_operationnelles()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nb_paiements bigint;
  v_nb_factures bigint;
  v_nb_lignes bigint;
  v_nb_livraisons bigint;
  v_nb_mouvements bigint;
  v_nb_lot_ing bigint;
  v_nb_lots bigint;
  v_nb_depenses bigint;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  -- Compte avant suppression pour le rapport
  select count(*) into v_nb_paiements from public.paiements;
  select count(*) into v_nb_factures from public.factures;
  select count(*) into v_nb_lignes from public.lignes_livraison;
  select count(*) into v_nb_livraisons from public.livraisons;
  select count(*) into v_nb_mouvements from public.mouvements_stock;
  select count(*) into v_nb_lot_ing from public.lot_ingredients;
  select count(*) into v_nb_lots from public.lots;
  select count(*) into v_nb_depenses from public.depenses;

  -- Ordre de suppression : depend des FK
  -- paiements -> CASCADE depuis factures, mais on supprime en premier pour clarte
  delete from public.paiements;
  delete from public.factures;
  -- lignes_livraison -> CASCADE depuis livraisons
  delete from public.lignes_livraison;
  delete from public.livraisons;
  -- mouvements_stock -> on delete restrict depuis lots, donc d'abord
  delete from public.mouvements_stock;
  -- lot_ingredients -> CASCADE depuis lots, mais explicite
  delete from public.lot_ingredients;
  delete from public.lots;
  delete from public.depenses;

  -- Reset de la sequence factures (la numerotation FAC-YYYY-00001 repart a 1)
  alter sequence public.factures_numero_seq restart with 1;

  return json_build_object(
    'paiements', v_nb_paiements,
    'factures', v_nb_factures,
    'lignes_livraison', v_nb_lignes,
    'livraisons', v_nb_livraisons,
    'mouvements_stock', v_nb_mouvements,
    'lot_ingredients', v_nb_lot_ing,
    'lots', v_nb_lots,
    'depenses', v_nb_depenses
  );
end;
$$;

revoke all on function public.reset_donnees_operationnelles() from public;
grant execute on function public.reset_donnees_operationnelles() to authenticated;

-- 7. Policy DELETE pour factures (Patron uniquement, pour les fonctions RPC)
-- Note : SECURITY DEFINER bypass deja RLS, mais on l'ajoute par coherence
-- (si jamais le code appelle un delete direct depuis l'API supabase).
drop policy if exists factures_patron_delete on public.factures;
create policy factures_patron_delete on public.factures
  for delete to authenticated
  using (public.auth_role() = 'patron');

-- 8. Policy DELETE pour mouvements_stock (Patron uniquement, via reset)
drop policy if exists mouvements_patron_delete on public.mouvements_stock;
create policy mouvements_patron_delete on public.mouvements_stock
  for delete to authenticated
  using (public.auth_role() = 'patron');
