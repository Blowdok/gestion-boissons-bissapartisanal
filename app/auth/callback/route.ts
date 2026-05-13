import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback Supabase Auth (PKCE).
 *
 * Echange le code retourne par Supabase (apres clic sur un lien email de
 * confirmation, reset password, magic link) contre une session valide
 * stockee dans les cookies, puis redirige vers la page suivante.
 *
 * Lien email typique :
 *   https://<projet>.supabase.co/auth/v1/verify
 *     ?token=...&type=recovery
 *     &redirect_to=https://app.exemple.com/auth/callback?next=/reset/confirm
 *
 * Apres verification du token Supabase, redirection vers :
 *   https://app.exemple.com/auth/callback?code=xxx&next=/reset/confirm
 *
 * Cette route :
 *   1. Recupere le code dans searchParams
 *   2. L'echange contre une session (exchangeCodeForSession)
 *   3. Redirige vers `next` (defaut "/")
 *
 * Sans cet echange, l'utilisateur arrive sur la page suivante sans session
 * et toute action authentifiee (updateUser, etc.) echoue.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=Lien%20invalide`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=Lien%20expire%20ou%20invalide`,
    );
  }

  // Eviter les open-redirects : on n'accepte que des chemins relatifs.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
