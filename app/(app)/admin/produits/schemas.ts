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
  // Poids net unitaire en grammes (saisie obligatoire) — affiché sur le BL.
  // Plafond 50 kg : large marge pour des packs ou contenants lourds.
  poids_grammes: z.coerce
    .number()
    .int("Saisir un nombre entier (en grammes).")
    .min(1, "Poids requis (en grammes).")
    .max(50000, "Maximum 50 000 g."),
  seuil_alerte: z.coerce.number().int().min(0, "Doit être ≥ 0.").max(100000),
  prix_defaut_ht: z.coerce.number().min(0, "Doit être ≥ 0.").max(9999),
});

export type ProduitInput = z.infer<typeof produitSchema>;
