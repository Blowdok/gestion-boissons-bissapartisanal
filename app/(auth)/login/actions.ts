"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Role } from "@/lib/auth/roles";

export type LoginState = {
  error?: string;
};

export async function login(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Identifiants incorrects." };
  }

  // Lire le profil pour rediriger sur la home du role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connexion impossible." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, actif")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.actif) {
    await supabase.auth.signOut();
    return { error: "Compte inactif. Contacte ton administrateur." };
  }

  redirect(ROLE_HOME[profile.role as Role]);
}
