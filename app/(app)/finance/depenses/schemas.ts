import { z } from "zod";
import {
  MODES_PAIEMENT_DEPENSE,
  SOURCES_FONDS,
} from "@/lib/domain/source-fonds";

export const CATEGORIES_DEPENSE = [
  "matieres_premieres",
  "emballage",
  "energie",
  "transport",
  "marketing",
  "loyer",
  "assurance",
  "banque",
  "salaires",
  "taxes",
  "fournitures",
  "autre",
] as const;

export type CategorieDepense = (typeof CATEGORIES_DEPENSE)[number];

export const CATEGORIE_LABELS: Record<CategorieDepense, string> = {
  matieres_premieres: "Matières premières",
  emballage: "Emballage",
  energie: "Énergie (eau, élec, gaz)",
  transport: "Transport / véhicule",
  marketing: "Marketing / communication",
  loyer: "Loyer",
  assurance: "Assurance",
  banque: "Frais bancaires",
  salaires: "Salaires & charges",
  taxes: "Taxes & impôts",
  fournitures: "Fournitures diverses",
  autre: "Autre",
};

// =============================================================================
// Schéma d'une dépense (engagement) à créer
// =============================================================================
export const depenseSchema = z.object({
  date: z.string().min(1, "Date requise."),
  montant: z.coerce.number().min(0.01, "Montant ≥ 0,01 €.").max(999999),
  categorie: z.enum(CATEGORIES_DEPENSE),
  source_fonds: z.enum(SOURCES_FONDS),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DepenseInput = z.infer<typeof depenseSchema>;

// =============================================================================
// Schéma d'un paiement de dépense (échéance prévue et/ou payée)
// =============================================================================
export const paiementDepenseSchema = z
  .object({
    montant: z.coerce.number().min(0.01, "Montant ≥ 0,01 €.").max(999999),
    date_prevue: z.string().optional().or(z.literal("")),
    date_effectif: z.string().optional().or(z.literal("")),
    mode: z.enum(MODES_PAIEMENT_DEPENSE),
    note: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine(
    (v) => Boolean(v.date_prevue) || Boolean(v.date_effectif),
    {
      message:
        "Au moins une date doit être renseignée (prévue ou effective).",
      path: ["date_prevue"],
    },
  );

export type PaiementDepenseInput = z.infer<typeof paiementDepenseSchema>;
