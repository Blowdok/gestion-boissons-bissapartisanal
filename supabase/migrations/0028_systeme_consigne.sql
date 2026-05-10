-- =============================================================================
-- Systeme de consigne (Bissapa)
--
-- Le Patron applique une consigne sur chaque bouteille / flacon vendu
-- (0,05 EUR par defaut). Quand un client rend des bouteilles vides, on
-- deduit la consigne du montant a payer sur la facture en cours.
--
-- Choix d'implementation :
--   1. Tarif configurable via une table singleton 'parametres_entreprise'
--      (le Patron peut l'ajuster sans deploiement).
--   2. Pas de suivi des consignes en circulation par client : on deduit
--      simplement au moment de marquer la livraison 'livree'.
--   3. La facture stocke deux montants :
--        - montant_ht       : total des lignes (inchange)
--        - montant_consigne : credit applique (= nb * tarif)
--      Le client doit payer (montant_ht - montant_consigne).
--
-- Migration idempotente.
-- =============================================================================

-- 1. Table parametres_entreprise (singleton) ---------------------------------
create table if not exists public.parametres_entreprise (
  id                  boolean primary key default true check (id),
  tarif_consigne_eur  numeric(6, 2) not null default 0.05
    check (tarif_consigne_eur >= 0),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users(id)
);

comment on table public.parametres_entreprise is
  'Parametres globaux de l entreprise (singleton, une seule row identifiee par id=true).';
comment on column public.parametres_entreprise.tarif_consigne_eur is
  'Montant credite par bouteille / flacon rendu vide par le client.';

-- Insere la row unique si pas encore presente
insert into public.parametres_entreprise (id)
values (true)
on conflict (id) do nothing;

-- Trigger touch updated_at
drop trigger if exists parametres_entreprise_touch on public.parametres_entreprise;
create trigger parametres_entreprise_touch
  before update on public.parametres_entreprise
  for each row execute function public.touch_updated_at();

-- RLS : tous les authentifies peuvent lire (le tarif est utile pour le calcul
-- cote app), seul le Patron peut modifier.
alter table public.parametres_entreprise enable row level security;

drop policy if exists parametres_select on public.parametres_entreprise;
create policy parametres_select on public.parametres_entreprise
  for select to authenticated using (true);

drop policy if exists parametres_patron_update on public.parametres_entreprise;
create policy parametres_patron_update on public.parametres_entreprise
  for update to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- 2. Colonne nb_consignes_recuperees sur livraisons --------------------------
alter table public.livraisons
  add column if not exists nb_consignes_recuperees integer not null default 0
    check (nb_consignes_recuperees >= 0);

comment on column public.livraisons.nb_consignes_recuperees is
  'Nombre de bouteilles / flacons vides rapportes par le client lors de cette livraison. Saisi au moment de marquer livree, ouvre droit a un credit consigne sur la facture.';

-- 3. Colonne montant_consigne sur factures -----------------------------------
alter table public.factures
  add column if not exists montant_consigne numeric(10, 2) not null default 0
    check (montant_consigne >= 0);

comment on column public.factures.montant_consigne is
  'Credit consigne applique a la facture (= nb_consignes_recuperees x tarif_consigne_eur). Le client paie (montant_ht - montant_consigne).';

-- 4. Mise a jour du trigger creer_facture_si_livree --------------------------
-- Le trigger lit maintenant nb_consignes_recuperees + tarif_consigne_eur
-- et stocke le credit dans la facture.
create or replace function public.creer_facture_si_livree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_montant   numeric(10, 2);
  v_consigne  numeric(10, 2);
  v_tarif     numeric(6, 2);
  v_numero    text;
  v_year      text := to_char(now(), 'YYYY');
  v_seq       bigint;
begin
  -- Ne s'applique qu'a la transition vers 'livree'
  if new.statut <> 'livree' or old.statut = 'livree' then
    return new;
  end if;

  -- Empeche le double si une facture existe deja
  if exists (select 1 from public.factures where livraison_id = new.id) then
    return new;
  end if;

  -- Calcule le montant total HT
  select coalesce(sum(qte * prix_unitaire_ht), 0)
    into v_montant
  from public.lignes_livraison
  where livraison_id = new.id;

  if v_montant = 0 then
    raise exception 'Impossible de facturer une livraison sans ligne ou a 0 EUR.'
      using errcode = 'P0001';
  end if;

  -- Calcule le credit consigne (lit le tarif courant)
  select coalesce(tarif_consigne_eur, 0.05)
    into v_tarif
  from public.parametres_entreprise
  where id = true;

  v_consigne := round(coalesce(new.nb_consignes_recuperees, 0) * v_tarif, 2);

  -- Le credit ne peut pas depasser le montant HT (sinon facture negative)
  if v_consigne > v_montant then
    v_consigne := v_montant;
  end if;

  -- Genere le numero FAC-YYYY-NNNNN (5 chiffres, padding zero)
  v_seq := nextval('public.factures_numero_seq');
  v_numero := 'FAC-' || v_year || '-' || lpad(v_seq::text, 5, '0');

  -- Pose la date de livraison si pas encore fait
  if new.date_livraison is null then
    new.date_livraison := now();
  end if;

  insert into public.factures (
    livraison_id, numero, date_emission, montant_ht, montant_consigne
  )
  values (
    new.id, v_numero, current_date, v_montant, v_consigne
  );

  return new;
end;
$$;

-- 5. Mise a jour de la vue factures_avec_solde -------------------------------
-- Le solde et le statut_paiement sont desormais calcules sur le
-- montant_du = montant_ht - montant_consigne.
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
  f.montant_consigne,
  (f.montant_ht - f.montant_consigne)::numeric(10, 2) as montant_du,
  f.pdf_url,
  f.annulee_le,
  f.annulee_par,
  f.motif_annulation,
  (f.annulee_le is not null) as est_annulee,
  l.client_id,
  l.date_livraison,
  l.statut as statut_livraison,
  l.nb_consignes_recuperees,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement <= current_date
  ), 0)::numeric(10, 2) as montant_encaisse,

  coalesce((
    select sum(montant) from public.paiements
    where facture_id = f.id and date_encaissement > current_date
  ), 0)::numeric(10, 2) as montant_a_encaisser,

  greatest(
    (f.montant_ht - f.montant_consigne)
      - coalesce((
          select sum(montant) from public.paiements where facture_id = f.id
        ), 0),
    0
  )::numeric(10, 2) as solde,

  case
    when f.annulee_le is not null then 'annulee'
    when coalesce((
      select sum(montant) from public.paiements where facture_id = f.id
    ), 0) >= (f.montant_ht - f.montant_consigne)
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

comment on view public.factures_avec_solde is
  'Factures avec solde et statut. montant_du = montant_ht - montant_consigne ; le solde est calcule sur ce montant_du.';
