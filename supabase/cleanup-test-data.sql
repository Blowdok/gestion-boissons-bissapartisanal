-- =============================================================================
-- PURGE DES DONNEES DE TEST (a executer une seule fois, juste avant la
-- mise en service reelle de l'application avec le Patron Bissapa).
--
-- Conserve : catalogue produits (les 10 vrais Bissapa + Zandjabila)
-- Supprime : clients fictifs, livraisons/factures/paiements de test,
--            lots et mouvements de stock, depenses de test
-- Reinitialise : sequence des numeros de facture (FAC-YYYY-NNNNN)
--
-- A executer dans le SQL Editor du Dashboard Supabase apres s'etre assure
-- qu'aucune vraie donnee n'a deja ete saisie.
-- =============================================================================

begin;

-- 1. Donnees operationnelles (ordre important : depend des FK)
delete from public.paiements;
delete from public.factures;
delete from public.lignes_livraison;
delete from public.livraisons;
delete from public.mouvements_stock;
delete from public.lots;
delete from public.depenses;

-- 2. Clients fictifs (3 lignes inserees par seed.sql)
delete from public.clients
where raison_sociale in (
  'Le Marche Creole',
  'Restaurant Ti Boucan',
  'Epicerie Vavangue'
);

-- 3. Reset de la sequence des numeros de facture (repart a FAC-AAAA-00001)
alter sequence if exists public.factures_numero_seq restart with 1;

-- 4. Verifications (devrait afficher 0 partout sauf produits = 10)
select 'produits' as table_name, count(*) from public.produits
union all select 'clients',    count(*) from public.clients
union all select 'lots',       count(*) from public.lots
union all select 'livraisons', count(*) from public.livraisons
union all select 'factures',   count(*) from public.factures
union all select 'paiements',  count(*) from public.paiements
union all select 'depenses',   count(*) from public.depenses;

commit;
