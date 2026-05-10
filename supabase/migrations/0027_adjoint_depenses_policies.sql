-- =============================================================================
-- Acces Adjoint aux depenses (Reinvestissement + Charges uniquement cote app)
--
-- Contexte : depuis la refonte du role Adjoint (= Patron par interim),
-- l'Adjoint doit pouvoir saisir des depenses imputees aux enveloppes
-- Reinvestissement et Charges. L'enveloppe Personnel reste reservee au Patron.
--
-- La restriction sur la source_fonds est faite cote application
-- (sourcesAccessiblesPour, voir lib/domain/source-fonds.ts) :
-- l'UI ne propose pas Personnel a l'Adjoint, le serveur le rejette aussi.
--
-- Cote RLS, on donne SELECT/INSERT/UPDATE a l'Adjoint sur depenses,
-- paiements_depense et le bucket Storage 'justificatifs'.
-- DELETE reste reserve au Patron (effacement definitif d'un justificatif
-- comptable).
--
-- Migration idempotente.
-- =============================================================================

-- 1. depenses : Adjoint = SELECT/INSERT/UPDATE
drop policy if exists depenses_adjoint_select on public.depenses;
create policy depenses_adjoint_select on public.depenses
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists depenses_adjoint_insert on public.depenses;
create policy depenses_adjoint_insert on public.depenses
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists depenses_adjoint_update on public.depenses;
create policy depenses_adjoint_update on public.depenses
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- 2. paiements_depense : Adjoint = SELECT/INSERT/UPDATE
drop policy if exists paiements_depense_adjoint_select on public.paiements_depense;
create policy paiements_depense_adjoint_select on public.paiements_depense
  for select to authenticated
  using (public.auth_role() = 'adjoint');

drop policy if exists paiements_depense_adjoint_insert on public.paiements_depense;
create policy paiements_depense_adjoint_insert on public.paiements_depense
  for insert to authenticated
  with check (public.auth_role() = 'adjoint');

drop policy if exists paiements_depense_adjoint_update on public.paiements_depense;
create policy paiements_depense_adjoint_update on public.paiements_depense
  for update to authenticated
  using (public.auth_role() = 'adjoint')
  with check (public.auth_role() = 'adjoint');

-- 3. Storage : bucket 'justificatifs' (Adjoint peut deposer et consulter)
drop policy if exists justificatifs_adjoint_select on storage.objects;
create policy justificatifs_adjoint_select on storage.objects
  for select to authenticated
  using (bucket_id = 'justificatifs' and public.auth_role() = 'adjoint');

drop policy if exists justificatifs_adjoint_insert on storage.objects;
create policy justificatifs_adjoint_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'justificatifs' and public.auth_role() = 'adjoint');
