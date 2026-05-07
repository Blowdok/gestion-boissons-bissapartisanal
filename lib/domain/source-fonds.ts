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

/**
 * Description courte de chaque enveloppe — affichée comme aide à la
 * saisie pour clarifier ce qu'il convient d'imputer où.
 */
export const SOURCE_DESCRIPTIONS: Record<SourceFonds, string> = {
  reinvestissement:
    "Achats qui font tourner la production : matières premières, emballages, étiquettes, outillage, machines.",
  charges:
    "Frais fixes récurrents : salaires employés, loyer, électricité, cotisations, logiciels, téléphone, transport, communication.",
  personnel:
    "Rémunération personnelle du patron — besoins perso et familiaux. Peut aussi servir à payer ponctuellement une charge ou un réinvestissement.",
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
 * Mapping catégorie → enveloppe par défaut, calé sur la classification
 * voulue par le patron de Bissapa :
 *   - Réinvestissement = matière première (englobe ingrédients, gaz/eau
 *     de prod, emballages, machines)
 *   - Charges = tout le reste de l'opérationnel récurrent
 *   - Personnel = rémunération propre du patron (jamais en défaut auto)
 *
 * Aligné avec les migrations 0017 (ré-imputation des sources) et 0018
 * (catégories métier).
 */
export function defaultSourcePourCategorie(
  categorie: CategorieDepense,
): SourceFonds {
  switch (categorie) {
    case "matieres_premieres":
      return "reinvestissement";
    case "salaire_employe":
    case "electricite":
    case "cotisations_etat":
    case "loyer":
    case "logiciel_facturation":
    case "telephone":
    case "transport":
    case "assurance":
    case "marketing_communication":
      return "charges";
    case "autres":
      // Par défaut sur réinvestissement (poste majoritaire), modifiable
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
