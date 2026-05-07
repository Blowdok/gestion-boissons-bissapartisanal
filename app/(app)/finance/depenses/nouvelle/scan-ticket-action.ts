"use server";

import { requireRole } from "@/lib/auth/guards";
import { checkAiActive } from "@/lib/ai/guards";
import {
  extraireDonneesTicket,
  type TicketExtraction,
} from "@/lib/ai/ocr-ticket";

export type ScanTicketResult =
  | { ok: true; data: TicketExtraction }
  | {
      ok: false;
      reason: "no_api_key" | "invalid_file" | "ai_error";
      message: string;
    };

const TYPES_AUTORISES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

/**
 * Server action : recoit une image de ticket dans un FormData,
 * appelle l'IA pour en extraire les donnees, retourne un resultat
 * structure.
 *
 * Acces : Patron + Adjoint uniquement (les depenses sont financieres).
 */
export async function scanTicket(
  formData: FormData,
): Promise<ScanTicketResult> {
  await requireRole("patron", "adjoint");

  const inactive = checkAiActive();
  if (inactive) {
    return {
      ok: false,
      reason: inactive.reason,
      message: inactive.message,
    };
  }

  const file = formData.get("ticket");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      reason: "invalid_file",
      message: "Aucun fichier reçu.",
    };
  }
  if (file.size > TAILLE_MAX) {
    return {
      ok: false,
      reason: "invalid_file",
      message: "Fichier trop lourd (max 5 Mo).",
    };
  }
  if (!TYPES_AUTORISES.includes(file.type)) {
    return {
      ok: false,
      reason: "invalid_file",
      message: "Format non supporté (JPEG, PNG, WebP ou HEIC attendus).",
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Modele eventuellement choisi par l'utilisateur dans le ModelPicker
    const modelRaw = formData.get("model");
    const model = typeof modelRaw === "string" ? modelRaw : undefined;
    const data = await extraireDonneesTicket(buffer, model);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      reason: "ai_error",
      message: (e as Error).message ?? "Échec de l'analyse IA.",
    };
  }
}
