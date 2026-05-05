"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { produitSchema } from "./schemas";

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

export async function createProduit(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireRole("patron");

  const parsed = produitSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { error } = await supabase
    .from("produits")
    .insert({ ...parsed.data, actif: true });

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { nom: "Un produit avec ce nom existe déjà." } };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/produits");
  revalidatePath("/admin");
  redirect("/admin/produits");
}

export async function updateProduit(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireRole("patron");

  const parsed = produitSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { error } = await supabase
    .from("produits")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { nom: "Un produit avec ce nom existe déjà." } };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/produits");
  revalidatePath("/admin");
  return {};
}

export async function toggleProduitActif(id: string, actif: boolean) {
  const { supabase } = await requireRole("patron");
  const { error } = await supabase.from("produits").update({ actif }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/produits");
  revalidatePath("/admin");
}

/**
 * Suppression definitive d'un produit. La cascade sur tarifs_clients supprime
 * automatiquement les tarifs negocies. En revanche, si le produit est reference
 * par des lots de production ou des lignes de livraison (a partir de la
 * Phase 2/3), la BDD refuse la suppression -> on retombe sur la desactivation.
 */
export async function supprimerProduit(id: string) {
  const { supabase } = await requireRole("patron");
  const { error } = await supabase.from("produits").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Ce produit est utilisé dans des lots ou livraisons : désactive-le plutôt que de le supprimer.",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/produits");
  revalidatePath("/admin");
}
