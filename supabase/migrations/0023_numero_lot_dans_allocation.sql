-- =============================================================================
-- Modifie le trigger d'allocation FIFO pour inclure numero_lot dans le jsonb
-- lots_utilises. Decision metier : le Patron veut voir le numero de lot
-- (saisi a la production) sur les BL, factures et fiche livraison, plutot
-- que la DLUO (deja imprimee sur l'etiquette de la bouteille).
--
-- Le jsonb passe de :
--   [{"lot_id": "...", "dluo": "2026-07-01", "qte": 500}]
-- a :
--   [{"lot_id": "...", "numero_lot": "2026-W12-A", "dluo": "2026-07-01", "qte": 500}]
--
-- On garde dluo dans le jsonb pour ne rien perdre (lecture future, audit),
-- mais l'UI affichera principalement numero_lot.
--
-- Backfill : enrichit les lignes existantes en re-injectant numero_lot
-- depuis la table lots, par jointure sur lot_id.
-- =============================================================================

-- 1. Mise a jour du trigger ---------------------------------------------------
create or replace function public.allouer_lots_fifo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restant   integer := new.qte;
  v_lot       record;
  v_prise     integer;
  v_alloc     jsonb := '[]'::jsonb;
  v_dispo     integer;
begin
  -- Verifie le stock total disponible
  select coalesce(sum(qte_disponible), 0) into v_dispo
  from public.stock_par_lot
  where produit_id = new.produit_id and qte_disponible > 0;

  if v_dispo < v_restant then
    raise exception 'Stock insuffisant pour le produit % : % demandes, % disponibles',
      new.produit_id, v_restant, v_dispo
      using errcode = 'P0001';
  end if;

  -- Itere sur les lots par DLUO ascendante
  for v_lot in
    select lot_id, qte_disponible, dluo, numero_lot
    from public.stock_par_lot
    where produit_id = new.produit_id and qte_disponible > 0
    order by dluo asc, lot_id asc
  loop
    exit when v_restant <= 0;
    v_prise := least(v_lot.qte_disponible, v_restant);

    -- Cree le mouvement de stock type 'livraison'
    insert into public.mouvements_stock (lot_id, type, qte, ref_id, created_by)
    values (v_lot.lot_id, 'livraison', v_prise, new.livraison_id, auth.uid());

    -- Trace dans lots_utilises (numero_lot ajoute pour BL/facture/UI)
    v_alloc := v_alloc || jsonb_build_object(
      'lot_id', v_lot.lot_id,
      'numero_lot', v_lot.numero_lot,
      'dluo', v_lot.dluo,
      'qte', v_prise
    );

    v_restant := v_restant - v_prise;
  end loop;

  -- Persiste les allocations sur la ligne
  new.lots_utilises := v_alloc;
  return new;
end;
$$;

-- 2. Backfill des lignes existantes ------------------------------------------
-- Pour chaque ligne dont lots_utilises ne contient pas encore numero_lot,
-- on enrichit chaque entree du tableau avec le numero_lot correspondant
-- (via jointure sur la table lots). Si numero_lot est null en BDD (saisie
-- optionnelle a la production), on conserve null dans le jsonb -> l'UI
-- bascule sur le fallback (8 chars du lot_id).
update public.lignes_livraison ll
set lots_utilises = sub.enriched
from (
  select
    ll2.id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'lot_id', elem->>'lot_id',
          'numero_lot', l.numero_lot,
          'dluo', elem->>'dluo',
          'qte', (elem->>'qte')::integer
        )
        order by ord
      ),
      '[]'::jsonb
    ) as enriched
  from public.lignes_livraison ll2,
       jsonb_array_elements(ll2.lots_utilises) with ordinality as t(elem, ord)
  left join public.lots l on l.id = (elem->>'lot_id')::uuid
  where ll2.lots_utilises is not null
    and jsonb_typeof(ll2.lots_utilises) = 'array'
    and jsonb_array_length(ll2.lots_utilises) > 0
    -- ne re-traite pas les lignes deja enrichies
    and not (ll2.lots_utilises->0 ? 'numero_lot')
  group by ll2.id
) sub
where ll.id = sub.id;
