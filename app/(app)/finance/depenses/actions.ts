"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { depenseSchema } from "./schemas";

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

export async function createDepense(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole("patron");

  const parsed = depenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  // Upload du justificatif si present
  const justificatif = formData.get("justificatif") as File | null;
  let justificatif_path: string | null = null;

  if (justificatif && justificatif.size > 0) {
    // Limite a 5 Mo et formats images/pdf
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

  const { data, error } = await supabase
    .from("depenses")
    .insert({
      ...parsed.data,
      description: parsed.data.description || null,
      justificatif_path,
      saisie_par: user.id,
    })
    .select("id")
    .single();

  if (error) {
    // Si la depense fail apres upload, on essaie de cleanup le fichier
    if (justificatif_path) {
      await supabase.storage.from("justificatifs").remove([justificatif_path]);
    }
    return { error: error.message };
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  redirect(`/finance?id=${data.id}`);
}

export async function supprimerDepense(id: string) {
  const { supabase } = await requireRole("patron");

  // Recupere le path du justificatif pour le supprimer aussi du Storage
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

/**
 * Genere une URL signee temporaire pour visualiser un justificatif.
 * Le path n'est pas accessible publiquement (bucket prive).
 */
export async function getJustificatifUrl(path: string): Promise<string | null> {
  const { supabase } = await requireRole("patron");
  const { data, error } = await supabase.storage
    .from("justificatifs")
    .createSignedUrl(path, 60 * 5); // 5 minutes

  if (error || !data) return null;
  return data.signedUrl;
}
