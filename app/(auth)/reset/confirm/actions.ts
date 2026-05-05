"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ConfirmState = {
  error?: string;
};

export async function setNewPassword(
  _prev: ConfirmState | undefined,
  formData: FormData,
): Promise<ConfirmState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Mot de passe trop court (8 caractères minimum)." };
  }
  if (password !== confirm) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Lien expiré ou invalide. Recommencez la réinitialisation." };
  }

  redirect("/login");
}
