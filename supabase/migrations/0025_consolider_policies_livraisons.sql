-- =============================================================================
-- Consolidation des policies RLS livraisons + lignes_livraison
--
-- Probleme observe : un compte Adjoint correctement enregistre en BDD
-- (profiles.role = 'adjoint', actif = true) recoit l'erreur
--   "new row violates row-level security policy for table livraisons"
-- au moment d'inserer une livraison, alors que :
--   - public.auth_role() retourne bien 'adjoint' pour cette session
--   - la policy livraisons_adjoint_insert existe bien
--   - elle dit `with check (auth_role() = 'adjoint')` ce qui devrait passer
--
-- Diagnostic : multiples policies INSERT separees par role + valeur
-- 'adjoint' ajoutee tardivement a l'enum role_utilisateur via ALTER TYPE
-- ADD VALUE => Postgres rejete l'INSERT meme si une policy aurait du
-- valider (probablement un probleme de cache de plan ou de comparaison
-- d'enum).
--
-- Solution : consolider toutes les policies INSERT/UPDATE en une seule
-- policy par action, qui liste tous les roles autorises. Plus simple,
-- plus robuste, plus rapide pour le planner.
--
-- Le DELETE reste reserve au Patron (suppression definitive).
-- Les regles metier specifiques (Livreur ne peut updater que ses
-- propres livraisons) restent dans des policies separees additives.
-- =============================================================================

-- 1. Livraisons : INSERT operationnel pour patron / adjoint / fab / livreur
drop policy if exists livraisons_patron_fab_insert on public.livraisons;
drop policy if exists livraisons_adjoint_insert on public.livraisons;
drop policy if exists livraisons_livreur_insert on public.livraisons;

create policy livraisons_insert_operationnel on public.livraisons
  for insert to authenticated
  with check (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 2. Livraisons : UPDATE operationnel
-- Patron + Adjoint + Fabrication peuvent updater toute livraison.
-- Livreur uniquement sur SES propres livraisons (regle conservee dans
-- une policy distincte additive plus bas).
drop policy if exists livraisons_patron_update on public.livraisons;
drop policy if exists livraisons_adjoint_update on public.livraisons;
drop policy if exists livraisons_fab_update on public.livraisons;

create policy livraisons_update_operationnel on public.livraisons
  for update to authenticated
  using (public.auth_role() in ('patron', 'adjoint', 'fabrication'))
  with check (public.auth_role() in ('patron', 'adjoint', 'fabrication'));

-- Livreur peut updater uniquement ses livraisons (statut, signature,
-- date_livraison) - policy additive (logique OR avec la precedente)
drop policy if exists livraisons_livreur_update_propre on public.livraisons;
create policy livraisons_livreur_update_propre on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'livreur' and livreur_id = auth.uid())
  with check (public.auth_role() = 'livreur' and livreur_id = auth.uid());

-- 3. Lignes_livraison : INSERT operationnel
drop policy if exists lignes_patron_fab_insert on public.lignes_livraison;
drop policy if exists lignes_adjoint_insert on public.lignes_livraison;
drop policy if exists lignes_livreur_insert on public.lignes_livraison;

create policy lignes_livraison_insert_operationnel on public.lignes_livraison
  for insert to authenticated
  with check (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 4. Lignes_livraison : UPDATE
drop policy if exists lignes_patron_update on public.lignes_livraison;
drop policy if exists lignes_adjoint_update on public.lignes_livraison;

create policy lignes_livraison_update_operationnel on public.lignes_livraison
  for update to authenticated
  using (public.auth_role() in ('patron', 'adjoint'))
  with check (public.auth_role() in ('patron', 'adjoint'));

-- 5. Lignes_livraison : DELETE (Patron + Adjoint, evite cascade orpheline)
drop policy if exists lignes_patron_delete on public.lignes_livraison;
drop policy if exists lignes_adjoint_delete on public.lignes_livraison;

create policy lignes_livraison_delete_operationnel on public.lignes_livraison
  for delete to authenticated
  using (public.auth_role() in ('patron', 'adjoint'));
