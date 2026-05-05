import { z } from "zod";

export const clientSchema = z.object({
  raison_sociale: z.string().trim().min(2, "Raison sociale requise (2 caractères min)."),
  contact: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Email invalide.").optional().or(z.literal("")),
  telephone: z.string().trim().max(40).optional().or(z.literal("")),
  adresse: z.string().trim().max(200).optional().or(z.literal("")),
  ville: z.string().trim().max(80).optional().or(z.literal("")),
  code_postal: z.string().trim().max(10).optional().or(z.literal("")),
  siret: z.string().trim().max(20).optional().or(z.literal("")),
  conditions_paiement: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const tarifSchema = z.object({
  parfum_id: z.string().uuid(),
  prix_ht: z.coerce.number().min(0, "Le prix doit être ≥ 0.").max(9999, "Prix trop élevé."),
});

export type TarifInput = z.infer<typeof tarifSchema>;

// Convertit "" en null pour les colonnes nullable de Postgres
export function nullify<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" || v === undefined ? null : v;
  }
  return out as { [K in keyof T]: T[K] extends string ? string | null : T[K] };
}
