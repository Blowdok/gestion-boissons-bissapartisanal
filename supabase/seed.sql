-- Seed de developpement (8 parfums Bissapa + jeu d'essai)
-- Source : https://bissapa.blowdok.fr/
-- Execute automatiquement par `supabase db reset` apres les migrations.
-- ⚠ Les profils sont crees via Supabase Auth lors de la phase 1, pas ici.
-- ⚠ Les prix sont des placeholders : le Patron les ajustera dans le module admin.

insert into public.parfums (nom, seuil_alerte, prix_defaut_ht, actif) values
  ('Bissap Nature',      50, 2.50, true),
  ('Bissap Menthe',      50, 2.50, true),
  ('Bissap Framboise',   50, 2.50, true),
  ('Bissap Litchi',      50, 2.50, true),
  ('Bissap Melon',       50, 2.50, true),
  ('Bissap Passion',     50, 2.50, true),
  ('Ananas & Coco',      50, 2.50, true),
  ('Ananas & Gingembre', 50, 2.50, true)
on conflict do nothing;
