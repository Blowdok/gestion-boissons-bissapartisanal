import { z } from "zod";

export const STATUTS_LIVRAISON = ["programmee", "en_cours", "livree", "annulee"] as const;
export type StatutLivraison = (typeof STATUTS_LIVRAISON)[number];

export const STATUT_LABEL: Record<StatutLivraison, string> = {
  programmee: "Programmée",
  en_cours: "En cours",
  livree: "Livrée",
  annulee: "Annulée",
};

export const STATUT_VARIANT: Record<StatutLivraison, "default" | "secondary" | "destructive" | "outline"> = {
  programmee: "outline",
  en_cours: "secondary",
  livree: "default",
  annulee: "destructive",
};

// Classes Tailwind pour des badges colores (override le variant) :
// fond fonce + texte blanc, lisible en clair et en sombre
export const STATUT_BADGE_CLASS: Record<StatutLivraison, string> = {
  programmee: "bg-blue-700 text-white hover:bg-blue-700 dark:bg-blue-800",
  en_cours: "bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-700",
  livree: "bg-emerald-700 text-white hover:bg-emerald-700 dark:bg-emerald-800",
  annulee: "bg-zinc-700 text-white hover:bg-zinc-700 dark:bg-zinc-800",
};

export type StatutPaiement = "paye" | "partiel" | "impaye" | "annulee";

export const STATUT_PAIEMENT_LABEL: Record<StatutPaiement, string> = {
  paye: "Payée",
  partiel: "Partielle",
  impaye: "Impayée",
  annulee: "Annulée",
};

export const STATUT_PAIEMENT_BADGE_CLASS: Record<StatutPaiement, string> = {
  paye: "bg-emerald-700 text-white hover:bg-emerald-700 dark:bg-emerald-800",
  partiel: "bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-700",
  impaye: "bg-red-700 text-white hover:bg-red-700 dark:bg-red-800",
  annulee: "bg-zinc-700 text-white hover:bg-zinc-700 dark:bg-zinc-800",
};

export const MODES_PAIEMENT = ["especes", "virement", "cheque", "carte"] as const;
export type ModePaiement = (typeof MODES_PAIEMENT)[number];

export const MODE_LABEL: Record<ModePaiement, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  carte: "Carte",
};

export const ligneSchema = z.object({
  produit_id: z.string().uuid(),
  qte: z.coerce.number().int().min(1, "Quantité ≥ 1."),
  prix_unitaire_ht: z.coerce.number().min(0, "Prix ≥ 0."),
});

export const livraisonSchema = z.object({
  client_id: z.string().uuid("Client requis."),
  date_prevue: z.string().min(1, "Date requise."),
  // Format HH:MM (input type="time" HTML). Optionnel.
  heure_prevue: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Heure invalide (format HH:MM).")
    .optional()
    .or(z.literal("")),
  livreur_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  // Les lignes sont serialisees en JSON dans un champ cache
  lignes: z.string().min(1, "Au moins une ligne requise."),
});

export type LivraisonInput = z.infer<typeof livraisonSchema>;
export type LigneInput = z.infer<typeof ligneSchema>;
