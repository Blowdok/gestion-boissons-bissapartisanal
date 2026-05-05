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
  livreur_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  // Les lignes sont serialisees en JSON dans un champ cache
  lignes: z.string().min(1, "Au moins une ligne requise."),
});

export type LivraisonInput = z.infer<typeof livraisonSchema>;
export type LigneInput = z.infer<typeof ligneSchema>;
