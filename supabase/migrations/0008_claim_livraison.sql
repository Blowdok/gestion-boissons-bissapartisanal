-- =============================================================================
-- Phase 3 (suite) — Permettre au Livreur de "prendre" une livraison non
-- assignee (livreur_id IS NULL) en cliquant un bouton dans sa tournee.
--
-- Implemente via une fonction SECURITY DEFINER plutot qu'une policy RLS,
-- car cela permet de restreindre l'update a la SEULE colonne livreur_id
-- et de garantir que la livraison etait bien libre (race condition safe).
-- =============================================================================

create or replace function public.claim_livraison(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.role_utilisateur;
begin
  v_role := public.auth_role();

  if v_role is null then
    raise exception 'Non authentifie.' using errcode = '42501';
  end if;

  if v_role <> 'livreur' then
    raise exception 'Reserve aux livreurs.' using errcode = '42501';
  end if;

  -- Update conditionnel : ne fait rien si la livraison est deja assignee
  -- ou pas dans un statut compatible. La condition livreur_id IS NULL
  -- evite la race entre deux livreurs qui cliqueraient simultanement.
  update public.livraisons
  set livreur_id = auth.uid()
  where id = p_id
    and livreur_id is null
    and statut in ('programmee', 'en_cours');

  if not found then
    raise exception 'Livraison deja prise par un autre livreur ou non disponible.'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.claim_livraison(uuid) from public;
grant execute on function public.claim_livraison(uuid) to authenticated;
