-- =============================================================================
-- Restauration du stock a l'annulation/suppression d'une livraison BROUILLON
--
-- Probleme : le trigger allouer_lots_fifo cree des mouvements_stock
-- type='livraison' a la creation des lignes. Quand on annulait ou
-- supprimait une livraison brouillon (programmee/en_cours, jamais livree
-- physiquement), ces mouvements restaient en base et le stock dispo
-- continuait a etre decremente a tort.
--
-- Decision metier :
--   - livraison BROUILLON (programmee/en_cours) annulee/supprimee : la
--     marchandise n'est PAS sortie de l'entrepot, on doit donc supprimer
--     les mouvements_stock pour que le stock dispo remonte. C'est ce que
--     fait cette migration via la RPC annuler_livraison + une RPC
--     supprimer_livraison_brouillon dediee.
--
--   - livraison LIVREE puis facturee, puis facture annulee : la marchandise
--     est physiquement chez le client. On ne touche PAS aux mouvements
--     (gere par annuler_facture - migration 0021). Si le client retourne
--     la marchandise, le Patron saisit un ajustement manuel.
--
-- Cette migration met aussi a jour annuler_livraison() pour nettoyer les
-- mouvements et ajoute supprimer_livraison_brouillon() (RPC, evite de faire
-- 2 DELETE separes cote client).
-- =============================================================================

-- 1. RPC annuler_livraison : nettoie les mouvements de stock --------------
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

  -- Restauration du stock : la marchandise n'a jamais quitte l'entrepot.
  -- Les mouvements crees par le trigger allouer_lots_fifo sont effaces.
  delete from public.mouvements_stock
  where ref_id = p_livraison_id and type = 'livraison';

  update public.livraisons
     set statut = 'annulee'
   where id = p_livraison_id;
end;
$$;

revoke all on function public.annuler_livraison(uuid) from public;
grant execute on function public.annuler_livraison(uuid) to authenticated;

-- 2. RPC supprimer_livraison_brouillon -----------------------------------
-- Combine en une seule transaction la suppression des mouvements puis de
-- la livraison (qui cascade les lignes). Bloque si une facture est
-- rattachee (FK ON DELETE RESTRICT le ferait de toute facon, mais le
-- message d'erreur est plus clair ici).
create or replace function public.supprimer_livraison_brouillon(
  p_livraison_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_a_facture boolean;
begin
  v_role := public.auth_role();
  if v_role <> 'patron' then
    raise exception 'Action reservee au Patron.' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.factures where livraison_id = p_livraison_id
  ) into v_a_facture;

  if v_a_facture then
    raise exception 'Une facture est rattachee a cette livraison : annule la facture a la place.'
      using errcode = 'P0001';
  end if;

  -- Restaure le stock
  delete from public.mouvements_stock
  where ref_id = p_livraison_id and type = 'livraison';

  -- Supprime la livraison (cascade lignes_livraison)
  delete from public.livraisons where id = p_livraison_id;
end;
$$;

revoke all on function public.supprimer_livraison_brouillon(uuid) from public;
grant execute on function public.supprimer_livraison_brouillon(uuid) to authenticated;
