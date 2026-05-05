-- =============================================================================
-- Phase 3 (suite) — Permettre au Livreur de supprimer ses propres paiements
-- pendant les 24h apres creation (correction d'une faute de frappe).
-- Au-dela, seul le Patron peut intervenir.
-- =============================================================================

drop policy if exists paiements_livreur_delete_recent on public.paiements;
create policy paiements_livreur_delete_recent on public.paiements
  for delete to authenticated
  using (
    public.auth_role() = 'livreur'
    and encaisse_par = auth.uid()
    and created_at > (now() - interval '24 hours')
  );

-- Note : la policy 'paiements_patron_delete' existe deja pour le Patron
-- (voir 0006). Les deux policies sont OR, donc le Patron garde son acces complet.
