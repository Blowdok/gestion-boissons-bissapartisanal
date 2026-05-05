"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { ligneSchema, livraisonSchema } from "./schemas";

const editMetadataSchema = z.object({
  date_prevue: z.string().min(1, "Date requise."),
  livreur_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

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

export async function createLivraison(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron", "fabrication");

  const parsed = livraisonSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  let lignes: z.infer<typeof ligneSchema>[];
  try {
    const raw = JSON.parse(parsed.data.lignes);
    lignes = z.array(ligneSchema).min(1, "Au moins une ligne.").parse(raw);
  } catch {
    return { fieldErrors: { lignes: "Lignes invalides." } };
  }

  const { client_id, date_prevue, livreur_id, notes } = parsed.data;

  // 1. Cree la livraison
  const { data: livraison, error: errLiv } = await supabase
    .from("livraisons")
    .insert({
      client_id,
      date_prevue,
      livreur_id: livreur_id || null,
      notes: notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (errLiv) return { error: errLiv.message };

  // 2. Insere les lignes (le trigger FIFO alloue les lots automatiquement)
  const lignesInsert = lignes.map((l) => ({
    livraison_id: livraison.id,
    ...l,
  }));

  const { error: errLignes } = await supabase
    .from("lignes_livraison")
    .insert(lignesInsert);

  if (errLignes) {
    // Rollback manuel : si l'insert des lignes echoue (ex: stock insuffisant),
    // supprime la livraison creee. Sinon on aurait une livraison orpheline.
    await supabase.from("livraisons").delete().eq("id", livraison.id);
    return { error: errLignes.message };
  }

  revalidatePath("/livraisons");
  revalidatePath("/stock");
  redirect(`/livraisons/${livraison.id}`);
}

export async function updateLivraisonMetadata(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireRole("patron", "fabrication");

  const parsed = editMetadataSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { date_prevue, livreur_id, notes } = parsed.data;
  const { error } = await supabase
    .from("livraisons")
    .update({
      date_prevue,
      livreur_id: livreur_id || null,
      notes: notes || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/livraisons");
  revalidatePath(`/livraisons/${id}`);
  revalidatePath("/livraisons/tournee");
  return {};
}

export async function claimLivraison(id: string) {
  const { supabase } = await requireRole("livreur");
  const { error } = await supabase.rpc("claim_livraison", { p_id: id });
  if (error) {
    // Mappe les messages techniques sur des messages metier
    if (/deja prise|deja assignee/i.test(error.message)) {
      throw new Error("Cette livraison vient d'être prise par un autre livreur.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/livraisons/tournee");
  revalidatePath(`/livraisons/${id}`);
  revalidatePath("/livraisons");
}

export async function changerStatutLivraison(
  id: string,
  statut: "programmee" | "en_cours" | "livree" | "annulee",
) {
  const { supabase, profile } = await requireRole("patron", "fabrication", "livreur");

  // Le Livreur ne peut updater que ses livraisons (RLS le verifie deja).
  // On laisse Postgres trancher.
  const update: { statut: typeof statut; date_livraison?: string | null } = { statut };
  if (statut === "livree") {
    update.date_livraison = new Date().toISOString();
  }
  if (statut === "programmee" || statut === "annulee") {
    update.date_livraison = null;
  }

  const { error } = await supabase.from("livraisons").update(update).eq("id", id);
  if (error) {
    // Code RLS denied
    if (error.code === "42501") {
      throw new Error("Permission refusee : tu ne peux modifier que tes propres livraisons.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/livraisons");
  revalidatePath(`/livraisons/${id}`);
  revalidatePath("/livraisons/tournee");
  revalidatePath("/factures");
  revalidatePath("/stock");
  if (profile.role === "patron") revalidatePath("/dashboard");
}

export async function annulerLivraison(id: string) {
  // Annulation = soft (statut='annulee') pour conserver l'historique.
  // Les mouvements de stock 'livraison' deja crees restent en BDD.
  // Si on veut compenser, le Patron peut creer un mouvement 'ajustement' manuel.
  return changerStatutLivraison(id, "annulee");
}

export async function supprimerLivraison(id: string) {
  // Suppression DEFINITIVE (Patron uniquement, RLS).
  // Possible seulement si pas de facture (ON DELETE RESTRICT bloque sinon).
  const { supabase } = await requireRole("patron");
  const { error } = await supabase.from("livraisons").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Impossible : une facture est rattachee. Annule plutot la livraison pour conserver la trace.",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/livraisons");
  revalidatePath("/stock");
  redirect("/livraisons");
}
