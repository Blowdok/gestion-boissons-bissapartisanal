/**
 * Sources de fonds (enveloppes budgétaires) sur lesquelles les dépenses
 * sont imputées. Calque du 50/30/20 historique du dashboard.
 *
 * Le mapping catégorie → source est seulement un défaut suggéré au
 * Patron lors de la saisie ; il peut surcharger via le sélecteur
 * (ex: salon marketing payé sur l'enveloppe perso).
 */

import type { CategorieDepense } from "@/app/(app)/finance/depenses/schemas";

export const SOURCES_FONDS = [
  "reinvestissement",
  "charges",
  "personnel",
] as const;

export type SourceFonds = (typeof SOURCES_FONDS)[number];

export const SOURCE_LABELS: Record<SourceFonds, string> = {
  reinvestissement: "Réinvestissement",
  charges: "Charges",
  personnel: "Personnel",
};

export const SOURCE_PCT: Record<SourceFonds, number> = {
  reinvestissement: 0.5,
  charges: 0.3,
  personnel: 0.2,
};

/**
 * Couleur d'accent par enveloppe (cohérent avec le dashboard existant).
 */
export const SOURCE_COLORS: Record<SourceFonds, "emerald" | "amber" | "blue"> = {
  reinvestissement: "emerald",
  charges: "amber",
  personnel: "blue",
};

/**
 * Mapping catégorie → enveloppe par défaut.
 * Aligné avec le backfill SQL de la migration 0016.
 */
export function defaultSourcePourCategorie(
  categorie: CategorieDepense,
): SourceFonds {
  switch (categorie) {
    case "matieres_premieres":
    case "emballage":
    case "marketing":
    case "fournitures":
    case "transport":
      return "reinvestissement";
    case "loyer":
    case "assurance":
    case "energie":
    case "banque":
    case "taxes":
      return "charges";
    case "salaires":
      return "personnel";
    case "autre":
      return "reinvestissement";
  }
}

// =============================================================================
// Modes de paiement pour les dépenses (séparé des modes côté ventes pour
// pouvoir évoluer indépendamment — par ex. ajout 'prelevement' ici uniquement).
// =============================================================================

export const MODES_PAIEMENT_DEPENSE = [
  "especes",
  "virement",
  "cheque",
  "prelevement",
  "carte",
  "autre",
] as const;

export type ModePaiementDepense = (typeof MODES_PAIEMENT_DEPENSE)[number];

export const MODE_DEPENSE_LABELS: Record<ModePaiementDepense, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  prelevement: "Prélèvement",
  carte: "Carte",
  autre: "Autre",
};

// =============================================================================
// Statut de paiement (calculé côté SQL via la vue depenses_avec_solde,
// dupliqué ici pour le typage TypeScript).
// =============================================================================

export const STATUTS_PAIEMENT_DEPENSE = [
  "paye",
  "partiel",
  "prevu",
  "a_payer",
] as const;

export type StatutPaiementDepense = (typeof STATUTS_PAIEMENT_DEPENSE)[number];

export const STATUT_DEPENSE_LABELS: Record<StatutPaiementDepense, string> = {
  paye: "Payée",
  partiel: "Partiel",
  prevu: "Prévu",
  a_payer: "À payer",
};
