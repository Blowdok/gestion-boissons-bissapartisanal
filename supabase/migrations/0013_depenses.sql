-- =============================================================================
-- Phase 4 — Finance : table depenses + bucket Storage 'justificatifs'
-- Acces strictement reserve au Patron (donnees financieres sensibles).
-- =============================================================================

-- ENUM des categories de depense (extensible plus tard si besoin)
do $$ begin
  create type public.categorie_depense as enum (
    'matieres_premieres',  -- fleur, sucre, aromes, ananas, gingembre, menthe...
    'emballage',           -- bouteilles, etiquettes, capsules
    'energie',             -- electricite, eau, gaz
    'transport',           -- carburant, entretien vehicule
    'marketing',           -- pub, salons, flyers
    'loyer',               -- local de production
    'assurance',           -- RC pro, multirisque
    'banque',              -- frais bancaires, terminal CB
    'salaires',            -- salaires + charges (si employes)
    'taxes',               -- impots, URSSAF, CFE
    'fournitures',         -- bureau, hygiene, petit materiel
    'autre'
  );
exception when duplicate_object then null; end $$;

-- Table depenses
create table if not exists public.depenses (
  id              uuid primary key default gen_random_uuid(),
  date            date not null default current_date,
  montant         numeric(10, 2) not null check (montant > 0),
  categorie       public.categorie_depense not null,
  description     text,
  -- Chemin du fichier dans le bucket Storage 'justificatifs' (peut etre null
  -- si pas de justificatif). Format : justificatifs/<uuid>/<filename>
  justificatif_path text,
  saisie_par      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists depenses_date_idx on public.depenses(date desc);
create index if not exists depenses_categorie_idx on public.depenses(categorie);

drop trigger if exists depenses_touch_updated on public.depenses;
create trigger depenses_touch_updated
  before update on public.depenses
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- RLS : depenses sont strictement Patron only
-- =============================================================================
alter table public.depenses enable row level security;

drop policy if exists depenses_patron_all on public.depenses;
create policy depenses_patron_all on public.depenses
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- L'Adjoint, Fabrication et Livreur n'ont AUCUN acces (pas de policy = pas d'acces)
-- C'est volontaire : les depenses revelent les marges, c'est confidentiel.

-- =============================================================================
-- Bucket Storage 'justificatifs' (cree dans une migration separee si besoin)
-- =============================================================================
-- Note : la creation des buckets via SQL n'est pas standard, generalement on
-- les cree via le dashboard Supabase ou l'API. La policy RLS sur storage.objects
-- ci-dessous prend effet une fois le bucket cree manuellement.

-- Policy storage : seul Patron peut lire/ecrire dans le bucket 'justificatifs'
drop policy if exists justificatifs_patron_select on storage.objects;
create policy justificatifs_patron_select on storage.objects
  for select to authenticated
  using (bucket_id = 'justificatifs' and public.auth_role() = 'patron');

drop policy if exists justificatifs_patron_insert on storage.objects;
create policy justificatifs_patron_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'justificatifs' and public.auth_role() = 'patron');

drop policy if exists justificatifs_patron_delete on storage.objects;
create policy justificatifs_patron_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'justificatifs' and public.auth_role() = 'patron');
