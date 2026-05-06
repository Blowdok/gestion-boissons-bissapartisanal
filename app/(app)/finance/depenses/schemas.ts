import { z } from "zod";

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

export const depenseSchema = z.object({
  date: z.string().min(1, "Date requise."),
  montant: z.coerce.number().min(0.01, "Montant ≥ 0,01 €.").max(999999),
  categorie: z.enum(CATEGORIES_DEPENSE),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DepenseInput = z.infer<typeof depenseSchema>;
