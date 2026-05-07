import { z } from "zod";
import {
  MODES_PAIEMENT_DEPENSE,
  SOURCES_FONDS,
} from "@/lib/domain/source-fonds";

// =============================================================================
// Catégories métier de Bissapa (alignées sur la migration 0018).
// L'ordre de la liste détermine l'ordre dans le sélecteur du formulaire.
// =============================================================================
export const CATEGORIES_DEPENSE = [
  "matieres_premieres",
  "salaire_employe",
  "electricite",
  "cotisations_etat",
  "loyer",
  "logiciel_facturation",
  "telephone",
  "transport",
  "assurance",
  "marketing_communication",
  "autres",
] as const;

export type CategorieDepense = (typeof CATEGORIES_DEPENSE)[number];

export const CATEGORIE_LABELS: Record<CategorieDepense, string> = {
  matieres_premieres: "Matière première",
  salaire_employe: "Salaire employé",
  electricite: "Électricité",
  cotisations_etat: "Cotisation de l'État",
  loyer: "Loyer",
  logiciel_facturation: "Logiciel facturation",
  telephone: "Téléphone",
  transport: "Transport (carburant, réparation)",
  assurance: "Assurance",
  marketing_communication: "Marketing & communication",
  autres: "Autres",
};

/**
 * Hint affiché sous la sélection de catégorie pour clarifier ce qu'on y
 * met (utile pour Emmanuel qui a explicité ce qu'il regroupe sous chaque
 * étiquette — notamment les ingrédients et fournitures de production qui
 * vont tous dans Matière première).
 */
export const CATEGORIE_HINTS: Partial<Record<CategorieDepense, string>> = {
  matieres_premieres:
    "Sucre, fleurs, fruits (ananas, gingembre, citron, menthe), gaz et eau de production, bouteilles, cartons, étiquettes, affiches, machines.",
  transport: "Carburant et réparation du véhicule (l'assurance est dans Assurance).",
  assurance: "RC professionnelle, assurance véhicule, multirisque local.",
  autres: "Tout ce qui ne rentre dans aucune autre catégorie.",
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
