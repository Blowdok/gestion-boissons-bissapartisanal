"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { paiementSchema } from "./schemas";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function enregistrerPaiement(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron", "livreur");

  const parsed = paiementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  // Verifie le solde restant pour ne pas surcaisser
  const { data: facture } = await supabase
    .from("factures_avec_solde")
    .select("solde")
    .eq("id", parsed.data.facture_id)
    .maybeSingle();

  if (!facture) return { error: "Facture introuvable." };
  if (parsed.data.montant > Number(facture.solde) + 0.001) {
    return {
      fieldErrors: {
        montant: `Le montant dépasse le solde restant (${Number(facture.solde).toFixed(2)} €).`,
      },
    };
  }

  const { error } = await supabase.from("paiements").insert({
    facture_id: parsed.data.facture_id,
    montant: parsed.data.montant,
    mode: parsed.data.mode,
    date_encaissement: parsed.data.date_encaissement,
    notes: parsed.data.notes || null,
    encaisse_par: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/factures/${parsed.data.facture_id}`);
  revalidatePath("/factures");
  revalidatePath("/dashboard");
  return {};
}
