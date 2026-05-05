"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { utilisateurSchema, generateTempPassword } from "./schemas";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Mot de passe temporaire genere a communiquer au nouvel utilisateur. */
  tempPassword?: string;
  newUserEmail?: string;
};

function fieldErrors(error: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createUtilisateur(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  // Garde-fou : seul le Patron peut creer des comptes
  await requireRole("patron");

  const parsed = utilisateurSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { email, nom, role, password } = parsed.data;
  const finalPassword = password && password.length >= 8 ? password : generateTempPassword(12);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { nom, role },
  });

  if (error) {
    if (/already.*registered/i.test(error.message) || /duplicate/i.test(error.message)) {
      return { fieldErrors: { email: "Un compte existe déjà pour cet email." } };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");

  // Si le Patron n'a pas saisi de mot de passe, on lui retourne le temporaire
  // pour qu'il puisse le communiquer au nouvel utilisateur.
  if (!password) {
    return { tempPassword: finalPassword, newUserEmail: email };
  }
  return {};
}

export async function toggleUtilisateurActif(id: string, actif: boolean) {
  const { profile, supabase } = await requireRole("patron");
  if (id === profile.id && !actif) {
    throw new Error("Tu ne peux pas désactiver ton propre compte.");
  }
  const { error } = await supabase.from("profiles").update({ actif }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
}

export async function envoyerResetPassword(email: string) {
  await requireRole("patron");
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset/confirm`,
  });
  if (error) throw new Error(error.message);
}

export async function changerRole(id: string, role: "patron" | "fabrication" | "livreur") {
  const { profile, supabase } = await requireRole("patron");
  if (id === profile.id && role !== "patron") {
    throw new Error("Tu ne peux pas changer ton propre rôle.");
  }
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/utilisateurs");
}

export async function supprimerUtilisateur(id: string) {
  const { profile } = await requireRole("patron");
  if (id === profile.id) {
    throw new Error("Tu ne peux pas supprimer ton propre compte.");
  }
  const admin = createAdminClient();
  // Le ON DELETE CASCADE sur profiles.id supprime automatiquement le profil.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  // Pas de redirect() ici : on est deja sur /admin/utilisateurs et le caller
  // appelle router.refresh() pour mettre a jour la liste. redirect() throwerait
  // un NEXT_REDIRECT qui serait pris a tort pour une erreur dans le try/catch.
}
