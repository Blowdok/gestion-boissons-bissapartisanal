import { z } from "zod";

export const GAMMES = ["bissapa", "zandjabila"] as const;
export type Gamme = (typeof GAMMES)[number];

export const GAMME_LABELS: Record<Gamme, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export const produitSchema = z.object({
  nom: z.string().trim().min(2, "Nom requis (2 caractères min).").max(80),
  gamme: z.enum(GAMMES),
  format: z.string().trim().min(2, "Format requis (ex : 25cl, 60ml).").max(20),
  seuil_alerte: z.coerce.number().int().min(0, "Doit être ≥ 0.").max(100000),
  prix_defaut_ht: z.coerce.number().min(0, "Doit être ≥ 0.").max(9999),
});

export type ProduitInput = z.infer<typeof produitSchema>;
