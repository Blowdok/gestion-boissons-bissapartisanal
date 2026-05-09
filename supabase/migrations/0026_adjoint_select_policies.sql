-- =============================================================================
-- Ajout de l'Adjoint aux policies SELECT manquantes
--
-- Bug observe : un Adjoint correctement enregistre en BDD ne pouvait pas
-- creer de livraison. Apres diagnostic on s'est apercu que :
--   - la policy INSERT autorisait bien l'Adjoint
--   - mais .insert(...).select("id") plante car le SELECT post-INSERT
--     ne trouve aucune policy SELECT qui valide pour l'Adjoint
--   - PostgreSQL renvoie alors l'erreur trompeuse
--     "new row violates row-level security policy"
--
-- Cause : la migration 0010 (ajout du role adjoint) a ajoute des policies
-- INSERT/UPDATE pour l'Adjoint mais a oublie d'etendre les policies
-- SELECT existantes (livraisons_select, lignes_select, factures_select,
-- paiements_select, lots_select_authenticated, mouvements_select).
--
-- Pour clients et tarifs_clients, c'est OK : clients_adjoint_all et
-- tarifs_adjoint_all sont des policies FOR ALL qui couvrent aussi SELECT.
--
-- Migration idempotente (drop + create).
-- =============================================================================

-- 1. Livraisons
drop policy if exists livraisons_select on public.livraisons;
create policy livraisons_select on public.livraisons
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 2. Lignes_livraison
drop policy if exists lignes_select on public.lignes_livraison;
create policy lignes_select on public.lignes_livraison
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 3. Factures (Adjoint = Patron par interim, doit voir les factures)
drop policy if exists factures_select on public.factures;
create policy factures_select on public.factures
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'livreur')
  );

-- 4. Paiements
drop policy if exists paiements_select on public.paiements;
create policy paiements_select on public.paiements
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'livreur')
  );

-- 5. Lots (Adjoint doit voir le stock pour les decisions metier)
drop policy if exists lots_select_authenticated on public.lots;
create policy lots_select_authenticated on public.lots
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 6. Mouvements_stock
drop policy if exists mouvements_select_authenticated on public.mouvements_stock;
create policy mouvements_select_authenticated on public.mouvements_stock
  for select to authenticated
  using (
    public.auth_role() in ('patron', 'adjoint', 'fabrication', 'livreur')
  );

-- 7. Paiements_insert : verifier aussi (Adjoint doit pouvoir encaisser)
drop policy if exists paiements_insert on public.paiements;
create policy paiements_insert on public.paiements
  for insert to authenticated
  with check (
    public.auth_role() in ('patron', 'adjoint', 'livreur')
  );
