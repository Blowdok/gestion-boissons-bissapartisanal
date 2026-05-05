"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { perteSchema } from "./schemas";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrors(error: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function declarerPerte(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron", "adjoint", "fabrication");

  const parsed = perteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  // Verifie que la quantite ne depasse pas le stock disponible du lot
  const { data: stock } = await supabase
    .from("stock_par_lot")
    .select("qte_disponible")
    .eq("lot_id", parsed.data.lot_id)
    .maybeSingle();

  if (!stock) {
    return { error: "Lot introuvable." };
  }
  if (parsed.data.qte > (stock.qte_disponible ?? 0)) {
    return {
      fieldErrors: {
        qte: `Quantité supérieure au stock disponible (${stock.qte_disponible} unités).`,
      },
    };
  }

  const { error } = await supabase.from("mouvements_stock").insert({
    lot_id: parsed.data.lot_id,
    type: "perte",
    qte: parsed.data.qte,
    motif: parsed.data.motif,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/stock");
  revalidatePath(`/stock/lots/${parsed.data.lot_id}`);
  redirect(`/stock/lots/${parsed.data.lot_id}`);
}
