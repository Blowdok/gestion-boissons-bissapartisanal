import { z } from "zod";

export const MOTIFS_PERTE = ["casse", "peremption", "retour_client", "autre"] as const;
export type MotifPerte = (typeof MOTIFS_PERTE)[number];

export const MOTIF_LABEL: Record<MotifPerte, string> = {
  casse: "Casse",
  peremption: "Péremption",
  retour_client: "Retour client",
  autre: "Autre",
};

export const perteSchema = z.object({
  lot_id: z.string().uuid("Lot requis."),
  qte: z.coerce.number().int().min(1, "La quantité doit être ≥ 1.").max(100000),
  motif: z.enum(MOTIFS_PERTE),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PerteInput = z.infer<typeof perteSchema>;
