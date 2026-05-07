"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { depenseSchema, paiementDepenseSchema } from "./schemas";

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

// =============================================================================
// Création d'une dépense + paiements initiaux (échéances ou règlements)
// =============================================================================
//
// FormData attendu :
//   - date, montant, categorie, source_fonds, description, justificatif (file)
//   - paiements_json : JSON.stringify d'un tableau PaiementDepenseInput[]
//     (peut être vide si la dépense est créée sans aucun paiement initial)
// =============================================================================
export async function createDepense(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron");

  // Champs simples de la dépense
  const baseRaw = {
    date: formData.get("date"),
    montant: formData.get("montant"),
    categorie: formData.get("categorie"),
    source_fonds: formData.get("source_fonds"),
    description: formData.get("description"),
  };
  const parsed = depenseSchema.safeParse(baseRaw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  // Paiements initiaux (optionnels, sérialisés en JSON par le client)
  const paiementsRaw = formData.get("paiements_json");
  let paiements: z.infer<typeof paiementDepenseSchema>[] = [];
  if (typeof paiementsRaw === "string" && paiementsRaw.trim().length > 0) {
    try {
      const parsedJson = JSON.parse(paiementsRaw);
      if (!Array.isArray(parsedJson)) {
        return { error: "Format paiements invalide (tableau attendu)." };
      }
      const valides: typeof paiements = [];
      for (let i = 0; i < parsedJson.length; i++) {
        const r = paiementDepenseSchema.safeParse(parsedJson[i]);
        if (!r.success) {
          return {
            error: `Paiement #${i + 1} invalide : ${r.error.issues[0]?.message ?? "données incorrectes"}.`,
          };
        }
        valides.push(r.data);
      }
      paiements = valides;
    } catch {
      return { error: "Paiements : JSON invalide." };
    }
  }

  // Cohérence : la somme des paiements ne doit pas dépasser le montant total
  // (on tolère 1 centime d'arrondi).
  const sommePaiements = paiements.reduce((acc, p) => acc + p.montant, 0);
  if (sommePaiements > parsed.data.montant + 0.01) {
    return {
      error: `La somme des paiements (${sommePaiements.toFixed(2)} €) dépasse le montant total de la dépense (${parsed.data.montant.toFixed(2)} €).`,
    };
  }

  // Upload du justificatif si présent
  const justificatif = formData.get("justificatif") as File | null;
  let justificatif_path: string | null = null;

  if (justificatif && justificatif.size > 0) {
    if (justificatif.size > 5 * 1024 * 1024) {
      return {
        fieldErrors: { justificatif: "Fichier trop lourd (max 5 Mo)." },
      };
    }
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ];
    if (!allowedTypes.includes(justificatif.type)) {
      return {
        fieldErrors: {
          justificatif: "Format non supporté (JPG, PNG, WebP, HEIC ou PDF).",
        },
      };
    }

    const ext = justificatif.name.split(".").pop() ?? "bin";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `${user.id}/${filename}`;

    const { error: uploadErr } = await supabase.storage
      .from("justificatifs")
      .upload(path, justificatif, {
        contentType: justificatif.type,
        upsert: false,
      });

    if (uploadErr) {
      return {
        error: `Échec de l'upload du justificatif : ${uploadErr.message}. Vérifie que le bucket 'justificatifs' existe dans Supabase Storage.`,
      };
    }
    justificatif_path = path;
  }

  // Insert dépense
  const { data: depense, error: errDep } = await supabase
    .from("depenses")
    .insert({
      date: parsed.data.date,
      montant: parsed.data.montant,
      categorie: parsed.data.categorie,
      source_fonds: parsed.data.source_fonds,
      description: parsed.data.description || null,
      justificatif_path,
      saisie_par: user.id,
    })
    .select("id")
    .single();

  if (errDep) {
    if (justificatif_path) {
      await supabase.storage.from("justificatifs").remove([justificatif_path]);
    }
    return { error: errDep.message };
  }

  // Insert paiements éventuels
  if (paiements.length > 0) {
    const rows = paiements.map((p) => ({
      depense_id: depense.id,
      montant: p.montant,
      date_prevue: p.date_prevue || null,
      date_effectif: p.date_effectif || null,
      mode: p.mode,
      note: p.note || null,
      saisie_par: user.id,
    }));
    const { error: errPay } = await supabase
      .from("paiements_depense")
      .insert(rows);
    if (errPay) {
      // Rollback : supprimer la dépense (cascade les paiements éventuels) + le justificatif
      await supabase.from("depenses").delete().eq("id", depense.id);
      if (justificatif_path) {
        await supabase.storage.from("justificatifs").remove([justificatif_path]);
      }
      return { error: `Échec ajout des paiements : ${errPay.message}` };
    }
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  redirect(`/finance/depenses/${depense.id}`);
}

// =============================================================================
// Suppression d'une dépense (cascade les paiements + le justificatif)
// =============================================================================
export async function supprimerDepense(id: string) {
  const { supabase } = await requireRole("patron");

  const { data: depense } = await supabase
    .from("depenses")
    .select("justificatif_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("depenses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (depense?.justificatif_path) {
    await supabase.storage
      .from("justificatifs")
      .remove([depense.justificatif_path]);
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

// =============================================================================
// URL signée temporaire pour visualiser un justificatif
// =============================================================================
export async function getJustificatifUrl(path: string): Promise<string | null> {
  const { supabase } = await requireRole("patron");
  const { data, error } = await supabase.storage
    .from("justificatifs")
    .createSignedUrl(path, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}

// =============================================================================
// Ajouter un paiement à une dépense existante (depuis la fiche détail)
// =============================================================================
export async function ajouterPaiementDepense(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron");

  const depense_id = formData.get("depense_id");
  if (typeof depense_id !== "string" || !depense_id) {
    return { error: "Dépense inconnue." };
  }

  const parsed = paiementDepenseSchema.safeParse({
    montant: formData.get("montant"),
    date_prevue: formData.get("date_prevue"),
    date_effectif: formData.get("date_effectif"),
    mode: formData.get("mode"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  // Vérifie que le paiement ne fait pas dépasser le montant total
  const [{ data: dep }, { data: paiementsExistants }] = await Promise.all([
    supabase
      .from("depenses")
      .select("montant")
      .eq("id", depense_id)
      .maybeSingle(),
    supabase
      .from("paiements_depense")
      .select("montant")
      .eq("depense_id", depense_id),
  ]);

  if (!dep) return { error: "Dépense introuvable." };
  const dejaProgramme = (paiementsExistants ?? []).reduce(
    (acc, p) => acc + Number(p.montant),
    0,
  );
  if (dejaProgramme + parsed.data.montant > Number(dep.montant) + 0.01) {
    return {
      error: `Ce paiement dépasse le solde restant. Reste : ${(Number(dep.montant) - dejaProgramme).toFixed(2)} €.`,
    };
  }

  const { error } = await supabase.from("paiements_depense").insert({
    depense_id,
    montant: parsed.data.montant,
    date_prevue: parsed.data.date_prevue || null,
    date_effectif: parsed.data.date_effectif || null,
    mode: parsed.data.mode,
    note: parsed.data.note || null,
    saisie_par: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/finance/depenses/${depense_id}`);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return {};
}

// =============================================================================
// Marquer un paiement prévu comme effectivement payé (saisit date_effectif)
// =============================================================================
export async function marquerPaiementPaye(
  paiement_id: string,
  date_effectif: string,
) {
  const { supabase } = await requireRole("patron");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_effectif)) {
    throw new Error("Date invalide (format attendu : YYYY-MM-DD).");
  }

  const { data: paiement, error: errFetch } = await supabase
    .from("paiements_depense")
    .select("depense_id, date_effectif")
    .eq("id", paiement_id)
    .maybeSingle();

  if (errFetch) throw new Error(errFetch.message);
  if (!paiement) throw new Error("Paiement introuvable.");
  if (paiement.date_effectif) {
    throw new Error("Ce paiement est déjà marqué comme payé.");
  }

  const { error } = await supabase
    .from("paiements_depense")
    .update({ date_effectif })
    .eq("id", paiement_id);
  if (error) throw new Error(error.message);

  revalidatePath(`/finance/depenses/${paiement.depense_id}`);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

// =============================================================================
// Supprimer un paiement (échéance ou règlement effectif)
// =============================================================================
export async function supprimerPaiementDepense(paiement_id: string) {
  const { supabase } = await requireRole("patron");

  const { data: paiement } = await supabase
    .from("paiements_depense")
    .select("depense_id")
    .eq("id", paiement_id)
    .maybeSingle();

  const { error } = await supabase
    .from("paiements_depense")
    .delete()
    .eq("id", paiement_id);
  if (error) throw new Error(error.message);

  if (paiement?.depense_id) {
    revalidatePath(`/finance/depenses/${paiement.depense_id}`);
  }
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}
