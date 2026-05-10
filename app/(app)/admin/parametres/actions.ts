"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";

const tarifConsigneSchema = z.coerce
  .number()
  .min(0, "Le tarif doit être positif ou nul.")
  .max(10, "Tarif anormalement élevé (>10 €).");

export type ActionState = { error?: string; ok?: boolean };

export async function mettreAJourTarifConsigne(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron");

  const parsed = tarifConsigneSchema.safeParse(formData.get("tarif_consigne_eur"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Valeur invalide." };
  }

  const { error } = await supabase
    .from("parametres_entreprise")
    .update({
      tarif_consigne_eur: parsed.data,
      updated_by: user.id,
    })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/admin/parametres");
  return { ok: true };
}
