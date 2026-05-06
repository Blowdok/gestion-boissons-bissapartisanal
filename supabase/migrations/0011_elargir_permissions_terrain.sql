-- =============================================================================
-- Phase 3 (suite) — Elargir les permissions terrain
-- Le Livreur/Vendeur est aussi commercial : il prend des commandes sur le
-- terrain, peut creer/modifier un client, declarer une perte (casse en
-- transport), creer une livraison spontanee.
-- La Production peut consulter les clients en lecture (preparation commandes).
-- =============================================================================

-- clients : Livreur peut INSERT et UPDATE (creer un client sur le terrain,
-- corriger des coordonnees). Pas de DELETE (suppression reservee Patron).
drop policy if exists clients_livreur_insert on public.clients;
create policy clients_livreur_insert on public.clients
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

drop policy if exists clients_livreur_update on public.clients;
create policy clients_livreur_update on public.clients
  for update to authenticated
  using (public.auth_role() = 'livreur')
  with check (public.auth_role() = 'livreur');

-- (Le SELECT etait deja autorise pour livreur, fabrication etc.)

-- livraisons : Livreur peut INSERT (commande prise sur le terrain).
-- L'UPDATE etait deja autorise sur ses propres livraisons via livreur_id.
drop policy if exists livraisons_livreur_insert on public.livraisons;
create policy livraisons_livreur_insert on public.livraisons
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

-- lignes_livraison : Livreur peut INSERT (cree les lignes de la livraison
-- qu'il vient de creer sur le terrain). Le trigger FIFO se declenche
-- automatiquement comme pour les autres roles.
drop policy if exists lignes_livreur_insert on public.lignes_livraison;
create policy lignes_livreur_insert on public.lignes_livraison
  for insert to authenticated
  with check (public.auth_role() = 'livreur');

-- mouvements_stock : Livreur peut INSERT pour declarer une perte (casse en
-- transport, retour client). Le trigger FIFO sur lignes_livraison cree deja
-- les mouvements 'livraison', mais pour 'perte' c'est un INSERT direct.
drop policy if exists mouvements_livreur_insert on public.mouvements_stock;
create policy mouvements_livreur_insert on public.mouvements_stock
  for insert to authenticated
  with check (public.auth_role() = 'livreur');
