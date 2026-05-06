-- =============================================================================
-- SEED DE PRODUCTION (a appliquer une seule fois sur la base SUPABASE
-- DU PATRON, juste apres l'application des migrations).
--
-- Contient UNIQUEMENT le catalogue produits (10 references Bissapa +
-- Zandjabila), pas de clients ni de donnees operationnelles.
--
-- A NE PAS CONFONDRE avec seed.sql qui inclut des clients fictifs et est
-- destine au developpement local uniquement.
-- =============================================================================

insert into public.produits (nom, gamme, format, seuil_alerte, prix_defaut_ht, actif) values
  ('Bissap Nature',      'bissapa',    '25cl', 50, 1.20, true),
  ('Bissap Passion',     'bissapa',    '25cl', 50, 1.20, true),
  ('Bissap Framboise',   'bissapa',    '25cl', 50, 1.20, true),
  ('Bissap Litchi',      'bissapa',    '25cl', 50, 1.20, true),
  ('Bissap Melon',       'bissapa',    '25cl', 50, 1.20, true),
  ('Ananas & Coco',      'bissapa',    '25cl', 50, 1.20, true),
  ('Bissap Menthe',      'bissapa',    '25cl', 50, 1.25, true),
  ('Ananas & Gingembre', 'bissapa',    '25cl', 50, 1.35, true),
  ('GingerShot Ananas',  'zandjabila', '60ml', 30, 1.80, true),
  ('GingerShot Citron',  'zandjabila', '60ml', 30, 1.80, true)
on conflict (nom) do nothing;
