"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { lignePaiementSchema, paiementMultiSchema } from "./schemas";

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

  const parsed = paiementMultiSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  let lignes: z.infer<typeof lignePaiementSchema>[];
  try {
    const raw = JSON.parse(parsed.data.lignes);
    lignes = z.array(lignePaiementSchema).min(1).max(5).parse(raw);
  } catch {
    return { fieldErrors: { lignes: "Lignes invalides." } };
  }

  // Verifie le solde restant
  const { data: facture } = await supabase
    .from("factures_avec_solde")
    .select("solde")
    .eq("id", parsed.data.facture_id)
    .maybeSingle();

  if (!facture) return { error: "Facture introuvable." };

  const totalSaisi = lignes.reduce((acc, l) => acc + l.montant, 0);
  if (totalSaisi > Number(facture.solde) + 0.001) {
    return {
      fieldErrors: {
        montant: `Total ${totalSaisi.toFixed(2)} € > solde restant ${Number(facture.solde).toFixed(2)} €.`,
      },
    };
  }

  // Insere les paiements en bloc (PostgREST insert array est atomique)
  const rows = lignes.map((l) => ({
    facture_id: parsed.data.facture_id,
    montant: l.montant,
    mode: l.mode,
    date_encaissement: parsed.data.date_encaissement,
    notes: l.notes || null,
    encaisse_par: user.id,
  }));

  const { error } = await supabase.from("paiements").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/factures/${parsed.data.facture_id}`);
  revalidatePath("/factures");
  revalidatePath("/livraisons");
  revalidatePath("/dashboard");
  return {};
}

export async function supprimerPaiement(id: string) {
  const { supabase } = await requireRole("patron", "livreur");

  // RLS arbitre : Patron toujours, Livreur si proprietaire ET < 24h
  // (cf. migration 0007). Si refuse, on retourne une erreur claire.
  const { data: paiement } = await supabase
    .from("paiements")
    .select("facture_id")
    .eq("id", id)
    .maybeSingle();

  if (!paiement) {
    throw new Error("Paiement introuvable.");
  }

  const { error } = await supabase.from("paiements").delete().eq("id", id);
  if (error) {
    if (error.code === "42501") {
      throw new Error(
        "Permission refusée : tu ne peux supprimer que tes propres paiements de moins de 24h. Contacte le Patron pour les paiements plus anciens.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath(`/factures/${paiement.facture_id}`);
  revalidatePath("/factures");
  revalidatePath("/livraisons");
  revalidatePath("/dashboard");
}
