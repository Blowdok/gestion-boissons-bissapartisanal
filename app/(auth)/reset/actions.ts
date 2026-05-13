"use server";

import { createClient } from "@/lib/supabase/server";

export type ResetState = {
  ok?: boolean;
  error?: string;
};

export async function requestReset(
  _prev: ResetState | undefined,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email requis." };

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Le lien email pointe sur /auth/callback qui echange le code PKCE
  // contre une session, puis redirige sur /reset/confirm avec une session
  // active permettant l'appel a updateUser({ password }).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset/confirm`,
  });

  // On retourne toujours ok=true pour ne pas reveler si l'email existe (anti-enum).
  if (error) {
    console.error("[reset]", error.message);
  }
  return { ok: true };
}
