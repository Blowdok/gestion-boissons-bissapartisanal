-- Seed de développement (8 parfums + jeu d'essai client)
-- Exécuté automatiquement par `supabase db reset` après les migrations.
-- ⚠ Les profils sont créés via Supabase Auth lors de la phase 1, pas ici.

insert into public.parfums (nom, seuil_alerte, prix_defaut_ht, actif) values
  ('Gingembre',     50, 2.50, true),
  ('Hibiscus',      50, 2.50, true),
  ('Citronnelle',   50, 2.50, true),
  ('Combava',       50, 2.80, true),
  ('Goyavier',      50, 2.80, true),
  ('Ananas-Victoria', 50, 3.00, true),
  ('Letchi',        50, 3.00, true),
  ('Vanille',       50, 3.20, true)
on conflict do nothing;
