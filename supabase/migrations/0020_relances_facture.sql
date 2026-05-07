-- =============================================================================
-- Phase V2 D — Relances impayés (V2-AI uniquement)
--
-- Tracking des emails de relance envoyés sur les factures impayées, pour :
--   - Empêcher d'en envoyer une nouvelle moins de 7 jours après la précédente
--   - Garder l'historique consultable depuis la fiche facture
--   - Permettre à un comptable de retracer la chaîne de relances
--
-- Niveau calibré selon l'ancienneté (suggéré par l'IA, modifiable manuellement) :
--   - courtoise        : < 30 jours d'ancienneté (simple rappel amical)
--   - ferme            : 30-60 jours (ton plus pressant)
--   - mise_en_demeure  : > 60 jours (préalable à action contentieuse)
-- =============================================================================

do $$ begin
  create type public.niveau_relance as enum (
    'courtoise',
    'ferme',
    'mise_en_demeure'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.relances_facture (
  id              uuid primary key default gen_random_uuid(),
  facture_id      uuid not null references public.factures(id) on delete cascade,
  niveau          public.niveau_relance not null,
  sujet           text not null,
  contenu_html    text not null,
  contenu_texte   text not null,
  envoye_a        text not null,
  envoye_par      uuid references auth.users(id) on delete set null,
  envoye_le       timestamptz not null default now(),
  message_id      text -- id retourné par Resend pour traçabilité
);

create index if not exists relances_facture_facture_idx
  on public.relances_facture(facture_id);
create index if not exists relances_facture_envoye_le_idx
  on public.relances_facture(envoye_le desc);

-- =============================================================================
-- RLS : aligné sur factures (Patron + Adjoint + Livreur read, Patron + Adjoint write)
-- =============================================================================
alter table public.relances_facture enable row level security;

drop policy if exists relances_facture_select on public.relances_facture;
create policy relances_facture_select on public.relances_facture
  for select to authenticated
  using (public.auth_role() in ('patron', 'adjoint', 'livreur'));

drop policy if exists relances_facture_insert on public.relances_facture;
create policy relances_facture_insert on public.relances_facture
  for insert to authenticated
  with check (public.auth_role() in ('patron', 'adjoint'));

-- Pas de policy delete : l'historique est immuable (audit trail).
-- Si l'envoi a échoué, on ne crée juste pas la ligne.
