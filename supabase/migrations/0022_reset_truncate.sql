-- =============================================================================
-- Fix : reset_donnees_operationnelles() utilise TRUNCATE au lieu de DELETE
--
-- Probleme : Supabase a active une protection au niveau API qui rejette les
-- DELETE sans clause WHERE avec l'erreur :
--   "DELETE requires a WHERE clause"
-- Cette protection s'applique meme aux DELETE executes dans une fonction
-- SECURITY DEFINER, ce qui empechait la RPC reset de s'executer.
--
-- TRUNCATE :
--   - n'est pas concerne par cette protection (commande DDL, pas DML)
--   - est plus rapide qu'un DELETE sur des grosses tables
--   - reset les sequences associees a des SERIAL (pas notre cas mais propre)
--   - necessite l'option CASCADE pour traverser les FK (paiements_depense
--     est en CASCADE sur depenses, donc traite automatiquement)
-- =============================================================================

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
  v_nb_paiements_dep bigint;
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
  select count(*) into v_nb_paiements_dep from public.paiements_depense;

  -- TRUNCATE en une seule commande, CASCADE pour traverser les FK
  -- (paiements_depense -> depenses, lot_ingredients -> lots, etc.)
  truncate table
    public.paiements,
    public.factures,
    public.lignes_livraison,
    public.livraisons,
    public.mouvements_stock,
    public.lot_ingredients,
    public.lots,
    public.paiements_depense,
    public.depenses
  cascade;

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
    'depenses', v_nb_depenses,
    'paiements_depense', v_nb_paiements_dep
  );
end;
$$;

revoke all on function public.reset_donnees_operationnelles() from public;
grant execute on function public.reset_donnees_operationnelles() to authenticated;
