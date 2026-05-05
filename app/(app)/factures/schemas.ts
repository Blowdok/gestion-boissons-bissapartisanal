import { z } from "zod";
import { MODES_PAIEMENT } from "../livraisons/schemas";

export { MODES_PAIEMENT, MODE_LABEL } from "../livraisons/schemas";

export const paiementSchema = z.object({
  facture_id: z.string().uuid(),
  montant: z.coerce.number().min(0.01, "Montant ≥ 0,01 €.").max(99999),
  mode: z.enum(MODES_PAIEMENT),
  date_encaissement: z.string().min(1, "Date requise."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PaiementInput = z.infer<typeof paiementSchema>;
