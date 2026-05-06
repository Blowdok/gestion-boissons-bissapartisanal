/**
 * Catalogue des ingredients tracables pour les lots Bissapa.
 *
 * - SECS : presents dans 100% des recettes Bissapa, donc obligatoires
 *   a la saisie d'un nouveau lot
 * - NATURELS : optionnels, dependent de la saveur (ananas, gingembre, menthe)
 *
 * Les Zandjabila n'ont pas de tracabilite ingredient pour l'instant.
 */

export const INGREDIENTS_SECS = [
  "fleur_bissap",
  "sucre",
  "arome",
] as const;

export const INGREDIENTS_NATURELS = [
  "ananas",
  "gingembre",
  "menthe",
] as const;

export const INGREDIENTS = [
  ...INGREDIENTS_SECS,
  ...INGREDIENTS_NATURELS,
] as const;

export type Ingredient = (typeof INGREDIENTS)[number];
export type IngredientSec = (typeof INGREDIENTS_SECS)[number];
export type IngredientNaturel = (typeof INGREDIENTS_NATURELS)[number];

export const INGREDIENT_LABELS: Record<Ingredient, string> = {
  fleur_bissap: "Fleur de bissap",
  sucre: "Sucre",
  arome: "Arôme",
  ananas: "Ananas (frais)",
  gingembre: "Gingembre (frais)",
  menthe: "Menthe (fraîche)",
};

export function isIngredientSec(i: Ingredient): boolean {
  return (INGREDIENTS_SECS as readonly string[]).includes(i);
}

/**
 * Indique si un produit (selon sa gamme) doit avoir une saisie d'ingredients.
 * Aujourd'hui : seule la gamme `bissapa` est concernee.
 */
export function gammeAvecIngredients(gamme: string): boolean {
  return gamme === "bissapa";
}
