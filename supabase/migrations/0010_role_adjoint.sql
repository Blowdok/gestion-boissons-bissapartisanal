-- =============================================================================
-- Phase 3 (suite) — Nouveau rôle 'adjoint'
-- L'Adjoint est un Patron temporaire avec droits élargis sur l'opérationnel
-- mais SANS accès finance, suppression définitive d'utilisateurs, ni promotion
-- vers Patron/Adjoint.
-- =============================================================================

-- 1. Ajout de la valeur 'adjoint' à l'enum role_utilisateur
do $$ begin
  alter type public.role_utilisateur add value if not exists 'adjoint' before 'fabrication';
exception when others then null; end $$;

-- =============================================================================
-- 2. Refonte des policies RLS
-- Les policies existantes 'patron' restent inchangees (Patron garde tout)
-- On ajoute des policies 'adjoint' en parallele pour les operations qu'il peut
-- aussi effectuer.
-- =============================================================================

-- profiles : Adjoint peut tout sauf DELETE
drop policy if exists profiles_adjoint_select on public.profiles;
create policy profiles_adjoint_select on public.profiles
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists profiles_adjoint_insert on public.profiles;
create policy profiles_adjoint_insert on public.profiles
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists profiles_adjoint_update on public.profiles;
create policy profiles_adjoint_update on public.profiles
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');
-- Pas de DELETE pour Adjoint : suppression definitive reservee Patron

-- produits : Adjoint peut INSERT/UPDATE mais pas DELETE
drop policy if exists produits_adjoint_insert on public.produits;
create policy produits_adjoint_insert on public.produits
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists produits_adjoint_update on public.produits;
create policy produits_adjoint_update on public.produits
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- clients : Adjoint = full CRUD
drop policy if exists clients_adjoint_all on public.clients;
create policy clients_adjoint_all on public.clients
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- tarifs_clients : Adjoint = full CRUD
drop policy if exists tarifs_adjoint_all on public.tarifs_clients;
create policy tarifs_adjoint_all on public.tarifs_clients
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- lots : Adjoint = comme Fabrication (tout sauf DELETE qui n'est pas autorisee)
drop policy if exists lots_adjoint_write on public.lots;
create policy lots_adjoint_write on public.lots
  for all to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- mouvements_stock : Adjoint peut INSERT
drop policy if exists mouvements_adjoint_insert on public.mouvements_stock;
create policy mouvements_adjoint_insert on public.mouvements_stock
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

-- livraisons : Adjoint = full CRUD (sauf DELETE qui reste Patron)
drop policy if exists livraisons_adjoint_insert on public.livraisons;
create policy livraisons_adjoint_insert on public.livraisons
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists livraisons_adjoint_update on public.livraisons;
create policy livraisons_adjoint_update on public.livraisons
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- lignes_livraison : Adjoint = INSERT + UPDATE + DELETE
drop policy if exists lignes_adjoint_insert on public.lignes_livraison;
create policy lignes_adjoint_insert on public.lignes_livraison
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists lignes_adjoint_update on public.lignes_livraison;
create policy lignes_adjoint_update on public.lignes_livraison
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

drop policy if exists lignes_adjoint_delete on public.lignes_livraison;
create policy lignes_adjoint_delete on public.lignes_livraison
  for delete to authenticated
  using (public.auth_role() = 'adjoint');

-- factures : Adjoint peut SELECT et UPDATE
drop policy if exists factures_adjoint_select on public.factures;
create policy factures_adjoint_select on public.factures
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists factures_adjoint_update on public.factures;
create policy factures_adjoint_update on public.factures
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- paiements : Adjoint peut SELECT/INSERT/UPDATE/DELETE
drop policy if exists paiements_adjoint_select on public.paiements;
create policy paiements_adjoint_select on public.paiements
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists paiements_adjoint_insert on public.paiements;
create policy paiements_adjoint_insert on public.paiements
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists paiements_adjoint_update on public.paiements;
create policy paiements_adjoint_update on public.paiements
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

drop policy if exists paiements_adjoint_delete on public.paiements;
create policy paiements_adjoint_delete on public.paiements
  for delete to authenticated
  using (public.auth_role() = 'adjoint');

-- =============================================================================
-- 3. Note pour la finance (Phase 4)
-- Quand on creera la table 'depenses', les policies seront 'patron only' :
-- l'Adjoint n'a PAS acces aux donnees financieres.
-- =============================================================================
