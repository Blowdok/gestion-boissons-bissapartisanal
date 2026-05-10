"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { ligneSchema, livraisonSchema } from "./schemas";

export type SupprimerLivraisonResult =
  | { ok: true }
  | { ok: false; error: string };

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
  const { supabase, user } = await requireRole("patron", "adjoint", "fabrication", "livreur");

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
  const { supabase } = await requireRole("patron", "adjoint", "fabrication");

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
  options?: { nbConsignesRecuperees?: number },
) {
  // L'annulation passe TOUJOURS par la RPC annuler_livraison qui restaure
  // le stock (supprime les mouvements). On ne veut pas que le simple
  // UPDATE statut='annulee' laisse le stock decremente.
  if (statut === "annulee") {
    return annulerLivraison(id);
  }

  const { supabase } = await requireRole("patron", "adjoint", "fabrication", "livreur");

  // Le Livreur ne peut updater que ses livraisons (RLS le verifie deja).
  // On laisse Postgres trancher.
  const update: {
    statut: typeof statut;
    date_livraison?: string | null;
    nb_consignes_recuperees?: number;
  } = { statut };
  if (statut === "livree") {
    update.date_livraison = new Date().toISOString();
    // Le nb consignes est saisi dans la modale "Marquer livree". Le trigger
    // creer_facture_si_livree calcule automatiquement le credit consigne.
    const nb = Math.max(0, Math.floor(options?.nbConsignesRecuperees ?? 0));
    update.nb_consignes_recuperees = nb;
  }
  if (statut === "programmee") {
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
  // Le dashboard est consomme par Patron uniquement, mais on revalide toujours
  // pour qu'il soit a jour quel que soit le role qui declenche l'action.
  revalidatePath("/dashboard");
}

export async function annulerLivraison(id: string) {
  // Annulation d'une livraison BROUILLON (programmee/en_cours) :
  // RPC annuler_livraison qui supprime les mouvements_stock pour
  // restaurer le stock dispo (la marchandise n'a jamais quitte l'entrepot).
  // Pour une livraison deja livree+facturee, utiliser annuler_facture.
  const { supabase } = await requireRole("patron");
  const { error } = await supabase.rpc("annuler_livraison", {
    p_livraison_id: id,
  });
  if (error) {
    if (error.code === "42501") {
      throw new Error("Action reservee au Patron.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/livraisons");
  revalidatePath(`/livraisons/${id}`);
  revalidatePath("/livraisons/tournee");
  revalidatePath("/stock");
  revalidatePath("/production");
  revalidatePath("/dashboard");
}

export async function supprimerLivraison(
  id: string,
): Promise<SupprimerLivraisonResult> {
  // Suppression DEFINITIVE d'une livraison BROUILLON (Patron uniquement).
  // Passe par la RPC supprimer_livraison_brouillon qui :
  //  1. verifie qu'aucune facture n'est rattachee
  //  2. supprime les mouvements_stock pour restaurer le stock dispo
  //  3. supprime la livraison (cascade les lignes)
  // Tout en transaction SQL : si une etape echoue, rien n'est applique.
  const { supabase } = await requireRole("patron");
  const { error } = await supabase.rpc("supprimer_livraison_brouillon", {
    p_livraison_id: id,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/livraisons");
  revalidatePath("/stock");
  revalidatePath("/production");
  revalidatePath("/dashboard");
  return { ok: true };
}
