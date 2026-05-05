-- =============================================================================
-- Phase 1 — Schema initial : profiles, parfums, clients, tarifs_clients
-- + helpers d'autorisation (auth_role) + politiques RLS par role
-- =============================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Type ENUM des roles ------------------------------------------------------
do $$ begin
  create type public.role_utilisateur as enum ('patron', 'fabrication', 'livreur');
exception when duplicate_object then null; end $$;

-- Table profiles -----------------------------------------------------------
-- Chaque ligne miroir d'un auth.users avec un role et un nom affichable.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nom         text not null,
  role        public.role_utilisateur not null,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role) where actif;

-- Helper auth_role() -------------------------------------------------------
-- Renvoie le role du user connecte, ou NULL s'il n'a pas de profil actif.
-- security definer + search_path verrouille pour eviter une attaque via le path.
create or replace function public.auth_role()
returns public.role_utilisateur
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and actif = true
  limit 1;
$$;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;

-- Trigger updated_at -------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Table parfums ------------------------------------------------------------
create table if not exists public.parfums (
  id              uuid primary key default gen_random_uuid(),
  nom             text not null unique,
  seuil_alerte    integer not null default 50 check (seuil_alerte >= 0),
  prix_defaut_ht  numeric(10, 2) not null check (prix_defaut_ht >= 0),
  actif           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists parfums_actif_idx on public.parfums(actif);

drop trigger if exists parfums_touch_updated on public.parfums;
create trigger parfums_touch_updated
  before update on public.parfums
  for each row execute function public.touch_updated_at();

-- Table clients (B2B) ------------------------------------------------------
create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  raison_sociale        text not null,
  contact               text,
  email                 citext,
  telephone             text,
  adresse               text,
  ville                 text,
  code_postal           text,
  siret                 text,
  conditions_paiement   text,
  notes                 text,
  actif                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists clients_raison_sociale_idx on public.clients using gin (raison_sociale gin_trgm_ops);
-- Si pg_trgm pas encore installe, on retombe sur un index simple :
do $$ begin
  create extension if not exists "pg_trgm";
exception when others then null; end $$;

create index if not exists clients_ville_idx on public.clients(ville);
create index if not exists clients_actif_idx on public.clients(actif);

drop trigger if exists clients_touch_updated on public.clients;
create trigger clients_touch_updated
  before update on public.clients
  for each row execute function public.touch_updated_at();

-- Table tarifs_clients (prix negocies par parfum) --------------------------
create table if not exists public.tarifs_clients (
  client_id    uuid not null references public.clients(id) on delete cascade,
  parfum_id    uuid not null references public.parfums(id) on delete cascade,
  prix_ht      numeric(10, 2) not null check (prix_ht >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (client_id, parfum_id)
);

drop trigger if exists tarifs_clients_touch_updated on public.tarifs_clients;
create trigger tarifs_clients_touch_updated
  before update on public.tarifs_clients
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Trigger : provisionne automatiquement un profil a la creation d'un user
-- via l'API admin (raw_user_meta_data contient nom + role)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nom, role, actif)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.role_utilisateur, 'livreur'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- profiles -----------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'patron');

drop policy if exists profiles_patron_all on public.profiles;
create policy profiles_patron_all on public.profiles
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- parfums ------------------------------------------------------------------
alter table public.parfums enable row level security;

drop policy if exists parfums_select_authenticated on public.parfums;
create policy parfums_select_authenticated on public.parfums
  for select to authenticated
  using (true);

drop policy if exists parfums_patron_write on public.parfums;
create policy parfums_patron_write on public.parfums
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- clients ------------------------------------------------------------------
alter table public.clients enable row level security;

drop policy if exists clients_select_authenticated on public.clients;
create policy clients_select_authenticated on public.clients
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists clients_patron_write on public.clients;
create policy clients_patron_write on public.clients
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- tarifs_clients -----------------------------------------------------------
alter table public.tarifs_clients enable row level security;

drop policy if exists tarifs_select_authenticated on public.tarifs_clients;
create policy tarifs_select_authenticated on public.tarifs_clients
  for select to authenticated
  using (public.auth_role() in ('patron', 'fabrication', 'livreur'));

drop policy if exists tarifs_patron_write on public.tarifs_clients;
create policy tarifs_patron_write on public.tarifs_clients
  for all to authenticated
  using (public.auth_role() = 'patron')
  with check (public.auth_role() = 'patron');

-- =============================================================================
-- Note pour la suite
-- =============================================================================
-- Les profils des utilisateurs de test seront crees via l'API admin Supabase
-- (script scripts/seed-users.mjs) plutot qu'en SQL pur, car cela necessite
-- de creer les comptes auth.users en passant par le service de signup.
