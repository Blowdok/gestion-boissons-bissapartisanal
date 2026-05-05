import { z } from "zod";

export const lotSchema = z.object({
  produit_id: z.string().uuid("Produit requis."),
  date_production: z.string().min(1, "Date requise."),
  dluo: z.string().min(1, "DLUO requise."),
  qte_produite: z.coerce.number().int().min(1, "La quantité doit être ≥ 1.").max(100000),
  numero_lot: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
}).refine(
  (data) => data.dluo >= data.date_production,
  { message: "La DLUO doit être postérieure ou égale à la date de production.", path: ["dluo"] },
);

export type LotInput = z.infer<typeof lotSchema>;
