import { z } from "zod";
import { MODES_PAIEMENT } from "../livraisons/schemas";

export { MODES_PAIEMENT, MODE_LABEL } from "../livraisons/schemas";

export const lignePaiementSchema = z.object({
  montant: z.coerce.number().min(0.01, "Montant ≥ 0,01 €.").max(99999),
  mode: z.enum(MODES_PAIEMENT),
  date_encaissement: z.string().min(1, "Date requise."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const paiementMultiSchema = z.object({
  facture_id: z.string().uuid(),
  // Lignes serialisees en JSON. Chaque ligne porte sa date d'encaissement
  // (cheque post-date, virement programme, etc.)
  lignes: z.string().min(1, "Au moins une ligne."),
});

export type LignePaiement = z.infer<typeof lignePaiementSchema>;
