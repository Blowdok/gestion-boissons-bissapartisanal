-- =============================================================================
-- Phase 3 (suite) — Permettre a tous les utilisateurs authentifies de lire
-- la liste des profils (id, nom, role, actif).
--
-- Cas d'usage : la Fabrication (ou le Livreur) qui cree une livraison doit
-- pouvoir choisir un livreur dans le dropdown. Sans cette policy, ils ne
-- voient que leur propre profil et la liste est vide.
--
-- C'est une donnee non sensible (savoir que Marie est Fabrication ou que Jean
-- est Livreur ne pose pas de probleme dans une petite equipe artisanale).
-- =============================================================================

drop policy if exists profiles_select_all_authenticated on public.profiles;
create policy profiles_select_all_authenticated on public.profiles
  for select to authenticated
  using (true);

-- Les anciennes policies (profiles_select_self, profiles_adjoint_select,
-- profiles_patron_all SELECT) deviennent redondantes pour le SELECT mais ne
-- gênent pas (RLS combine en OR). On peut les laisser pour clarte
-- documentaire ou les nettoyer plus tard.
