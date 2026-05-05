"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { utilisateurSchema, generateTempPassword } from "./schemas";
import type { Role } from "@/lib/auth/roles";

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

// Roles que l'Adjoint peut affecter (pas Patron, pas Adjoint)
const ROLES_ADJOINT_ALLOWED: Role[] = ["fabrication", "livreur"];

export async function createUtilisateur(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { profile } = await requireRole("patron", "adjoint");

  const parsed = utilisateurSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { email, nom, role, password } = parsed.data;

  // Garde-fou Adjoint : ne peut pas creer de Patron ni d'autre Adjoint
  if (profile.role === "adjoint" && !ROLES_ADJOINT_ALLOWED.includes(role)) {
    return {
      fieldErrors: {
        role: "Un Adjoint ne peut créer qu'un Fabrication ou un Livreur.",
      },
    };
  }

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

  if (!password) {
    return { tempPassword: finalPassword, newUserEmail: email };
  }
  return {};
}

export async function toggleUtilisateurActif(id: string, actif: boolean) {
  const { profile, supabase } = await requireRole("patron", "adjoint");
  if (id === profile.id && !actif) {
    throw new Error("Tu ne peux pas désactiver ton propre compte.");
  }

  // Adjoint : interdit de toucher a un Patron
  if (profile.role === "adjoint") {
    const { data: cible } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    if (cible?.role === "patron") {
      throw new Error("Un Adjoint ne peut pas modifier un compte Patron.");
    }
  }

  const { error } = await supabase.from("profiles").update({ actif }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
}

export async function envoyerResetPassword(email: string) {
  await requireRole("patron", "adjoint");
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset/confirm`,
  });
  if (error) throw new Error(error.message);
}

export async function changerRole(id: string, role: Role) {
  const { profile, supabase } = await requireRole("patron", "adjoint");

  if (id === profile.id && role !== profile.role) {
    throw new Error("Tu ne peux pas changer ton propre rôle.");
  }

  // Garde-fous Adjoint :
  // - ne peut pas promouvoir vers Patron ou Adjoint
  // - ne peut pas modifier un Patron existant
  if (profile.role === "adjoint") {
    if (!ROLES_ADJOINT_ALLOWED.includes(role)) {
      throw new Error("Un Adjoint ne peut promouvoir que vers Fabrication ou Livreur.");
    }
    const { data: cible } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    if (cible?.role === "patron") {
      throw new Error("Un Adjoint ne peut pas modifier un compte Patron.");
    }
    if (cible?.role === "adjoint") {
      throw new Error("Un Adjoint ne peut pas rétrograder un autre Adjoint.");
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/utilisateurs");
}

export async function supprimerUtilisateur(id: string) {
  // Patron uniquement : suppression definitive trop sensible pour deleguer
  const { profile } = await requireRole("patron");
  if (id === profile.id) {
    throw new Error("Tu ne peux pas supprimer ton propre compte.");
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
}
