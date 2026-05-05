import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec privilèges service_role.
 *
 * ⚠ NE JAMAIS importer dans un Client Component ni exposer la cle au navigateur.
 * - Bypasse RLS (utiliser uniquement apres une verification de role manuelle)
 * - Reserve aux operations auth.admin (createUser, deleteUser, listUsers, etc.)
 *   et aux migrations de donnees critiques
 *
 * Pour les operations standard cote serveur, prefere lib/supabase/server.ts
 * qui utilise la session de l'utilisateur (RLS active).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquante.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
