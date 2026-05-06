-- =============================================================================
-- Phase 4 — Vues SQL agregees pour le dashboard finance
-- security_invoker = on : la RLS du caller est appliquee aux tables sources
-- (donc seul le Patron qui voit la table depenses voit ces agregats).
-- =============================================================================

-- CA mensuel : somme des montants encaisses (paiements ou date_encaissement
-- dans le mois). On distingue ENCAISSE (effectif) vs PROMIS (cheques futurs).
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
group by to_char(p.date_encaissement, 'YYYY-MM');

-- Depenses mensuelles
drop view if exists public.depenses_mensuelles;
create view public.depenses_mensuelles
with (security_invoker = on)
as
select
  to_char(d.date, 'YYYY-MM') as mois,
  sum(d.montant)::numeric(12, 2) as depenses_total,
  count(*)::integer as nb_depenses
from public.depenses d
group by to_char(d.date, 'YYYY-MM');

-- Top clients du mois (par CA encaisse + a encaisser)
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
group by to_char(p.date_encaissement, 'YYYY-MM'), l.client_id, c.raison_sociale;

-- Top produits du mois (par CA, base sur date facture pour eviter la confusion
-- avec les paiements qui peuvent etre etales)
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
group by to_char(f.date_emission, 'YYYY-MM'), ll.produit_id, pr.nom, pr.gamme;
