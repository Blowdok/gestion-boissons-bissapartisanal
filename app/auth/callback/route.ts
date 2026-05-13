import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback Supabase Auth — gere les deux formats de liens email :
 *
 * Format 1 (PKCE)  : /auth/callback?code=xxx&next=/...
 *   - Utilise exchangeCodeForSession() pour creer la session
 *
 * Format 2 (OTP)   : /auth/callback?token_hash=xxx&type=recovery&next=/...
 *   - Utilise verifyOtp() pour valider et creer la session
 *
 * Sans cette etape, la page suivante n'a pas de session, et
 * updateUser({ password }) echoue avec "Lien expire ou invalide".
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Sur Netlify, request.url contient parfois l'URL interne du deploiement
  // (hash--site.netlify.app) au lieu du custom domain. On force l'origin
  // depuis NEXT_PUBLIC_APP_URL pour que les redirections restent toujours
  // sur l'URL canonique et que les cookies de session se posent au bon
  // endroit.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Eviter les open-redirects : seulement des chemins relatifs internes.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();

  // Format PKCE : ?code=
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Format OTP : ?token_hash=&type=
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Aucun parametre reconnu : lien invalide
  console.error("[auth/callback] aucun code/token_hash dans l'URL");
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Lien invalide")}`,
  );
}
