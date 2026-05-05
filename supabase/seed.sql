-- Seed de developpement
-- - 8 parfums Bissapa (source : https://bissapa.blowdok.fr/)
-- - 2 parfums Zandjabila GingerShot (source : https://zandjabila.blowdok.fr/)
-- - 3 clients fictifs pour les tests
-- Execute par `supabase db reset`. Les utilisateurs sont crees via
-- scripts/seed-users.mjs (API admin Supabase, pas SQL).

-- Gamme Bissapa (bouteilles 50cl) ------------------------------------------
insert into public.parfums (nom, gamme, format, seuil_alerte, prix_defaut_ht, actif) values
  ('Bissap Nature',      'bissapa', '50cl', 50, 2.50, true),
  ('Bissap Menthe',      'bissapa', '50cl', 50, 2.50, true),
  ('Bissap Framboise',   'bissapa', '50cl', 50, 2.50, true),
  ('Bissap Litchi',      'bissapa', '50cl', 50, 2.50, true),
  ('Bissap Melon',       'bissapa', '50cl', 50, 2.50, true),
  ('Bissap Passion',     'bissapa', '50cl', 50, 2.50, true),
  ('Ananas & Coco',      'bissapa', '50cl', 50, 2.50, true),
  ('Ananas & Gingembre', 'bissapa', '50cl', 50, 2.50, true)
on conflict (nom) do nothing;

-- Gamme Zandjabila (GingerShot 60ml) ---------------------------------------
insert into public.parfums (nom, gamme, format, seuil_alerte, prix_defaut_ht, actif) values
  ('GingerShot Ananas', 'zandjabila', '60ml', 30, 3.50, true),
  ('GingerShot Citron', 'zandjabila', '60ml', 30, 3.50, true)
on conflict (nom) do nothing;

-- 3 clients fictifs --------------------------------------------------------
insert into public.clients (raison_sociale, contact, email, telephone, adresse, ville, code_postal, conditions_paiement, actif) values
  ('Le Marche Creole',     'Marie Hoarau',   'contact@marche-creole.re',  '0262 12 34 56', '12 rue de Paris',         'Saint-Denis',     '97400', '30 jours fin de mois', true),
  ('Restaurant Ti Boucan', 'Jean Payet',     'jean@tiboucan.re',          '0262 78 90 12', 'Plage des Roches Noires', 'Saint-Gilles',    '97434', 'Comptant',             true),
  ('Epicerie Vavangue',    'Lea Rivière',    'lea@vavangue.re',           '0262 45 67 89', '5 chemin des Letchis',    'Le Tampon',       '97430', '15 jours',             true)
on conflict do nothing;
