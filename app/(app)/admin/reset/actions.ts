"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";

export type ResetStats = {
  paiements: number;
  factures: number;
  lignes_livraison: number;
  livraisons: number;
  mouvements_stock: number;
  lot_ingredients: number;
  lots: number;
  depenses: number;
};

// =============================================================================
// Reset des donnees operationnelles (Patron uniquement)
// Vide tout sauf : profils, utilisateurs, clients, produits, tarifs.
// Action IRREVERSIBLE - reservee a la mise en service initiale apres tests.
// =============================================================================
export async function resetDonneesOperationnelles(
  motCle: string,
): Promise<{ ok: true; stats: ResetStats } | { ok: false; error: string }> {
  // Garde-fou cote serveur : meme si l'UI verifie, on revalide ici
  if (motCle !== "RESET") {
    return {
      ok: false,
      error: "Mot-cle invalide. Saisis exactement « RESET » pour confirmer.",
    };
  }

  const { supabase } = await requireRole("patron");

  const { data, error } = await supabase.rpc("reset_donnees_operationnelles");

  if (error) return { ok: false, error: error.message };

  // Revalide toutes les pages qui consomment les donnees operationnelles
  revalidatePath("/dashboard");
  revalidatePath("/livraisons");
  revalidatePath("/factures");
  revalidatePath("/finance");
  revalidatePath("/stock");
  revalidatePath("/production");
  revalidatePath("/admin");

  return { ok: true, stats: data as ResetStats };
}
