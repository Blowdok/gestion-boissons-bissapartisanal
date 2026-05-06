/**
 * Modeles selectionnes par cas d'usage chez Bissapa.
 *
 * Strategie : mixer qualite et cout selon la tache.
 * - Vision OCR : Gemini Flash (rapide, peu cher, excellent FR)
 * - Tool-calling : Claude Sonnet (raisonnement structure, multi-step)
 * - Redaction courte : Claude Haiku (rapide, qualite suffisante)
 *
 * Les noms de modeles suivent la nomenclature OpenRouter
 * (https://openrouter.ai/models). A ajuster si un modele est deprecated.
 */
export const MODELS = {
  /** OCR de tickets de caisse, factures fournisseur, photos en general */
  vision: "google/gemini-2.5-flash",

  /** Assistant conversationnel avec tool-calling (Patron Copilot) */
  copilot: "anthropic/claude-sonnet-4.6",

  /** Generation de texte court (relances, descriptions, resumes) */
  redaction: "anthropic/claude-haiku-4.5",
} as const;

export type ModelKey = keyof typeof MODELS;
