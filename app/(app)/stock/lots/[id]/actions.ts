"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";

// =============================================================================
// Suppression definitive d'un lot
// Possible UNIQUEMENT s'il n'a jamais ete consomme (qte_disponible == qte_produite).
// Cas typique : erreur de saisie immediate juste apres creation du lot.
// Pour un lot deja entame, il faut passer par une perte ou attendre la DLUO.
// =============================================================================
export async function supprimerLot(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireRole("patron");

  // Verifie via la vue stock_par_lot que rien n'a bouge depuis la creation.
  // Le mouvement de production initial n'est pas une "consommation" - il
  // matche la qte_produite donc qte_disponible reste egale.
  const { data: stock } = await supabase
    .from("stock_par_lot")
    .select("qte_produite, qte_livree, qte_perdue")
    .eq("lot_id", id)
    .maybeSingle();

  if (!stock) {
    return { ok: false, error: "Lot introuvable." };
  }

  if ((stock.qte_livree ?? 0) > 0 || (stock.qte_perdue ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Ce lot a deja ete consomme (livraisons ou pertes enregistrees). Suppression impossible.",
    };
  }

  // Le mouvement 'production' auto-cree empeche le DELETE direct (FK restrict
  // depuis mouvements_stock). On le supprime manuellement d'abord.
  const { error: errMvt } = await supabase
    .from("mouvements_stock")
    .delete()
    .eq("lot_id", id);
  if (errMvt) return { ok: false, error: errMvt.message };

  // Les lot_ingredients sont en CASCADE depuis lots.
  const { error } = await supabase.from("lots").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/stock");
  revalidatePath("/production");
  return { ok: true };
}
