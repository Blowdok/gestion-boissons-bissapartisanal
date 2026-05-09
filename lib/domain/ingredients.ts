/**
 * Catalogue des ingredients tracables pour les lots Bissapa.
 *
 * - OBLIGATOIRES : presents dans 100% des recettes Bissapa (fleur de
 *   bissap + sucre), donc toujours saisis.
 * - OPTIONNELS : dependent de la saveur :
 *     - arome (5 parfums sur 8 : passion, framboise, litchi, ananas-coco...)
 *     - frais : ananas, gingembre, menthe (parfums naturels sans arome)
 *
 * Les Zandjabila n'ont pas de tracabilite ingredient pour l'instant.
 */

export const INGREDIENTS_OBLIGATOIRES = [
  "fleur_bissap",
  "sucre",
] as const;

export const INGREDIENTS_OPTIONNELS = [
  "arome",
  "ananas",
  "gingembre",
  "menthe",
] as const;

export const INGREDIENTS = [
  ...INGREDIENTS_OBLIGATOIRES,
  ...INGREDIENTS_OPTIONNELS,
] as const;

export type Ingredient = (typeof INGREDIENTS)[number];
export type IngredientObligatoire = (typeof INGREDIENTS_OBLIGATOIRES)[number];
export type IngredientOptionnel = (typeof INGREDIENTS_OPTIONNELS)[number];

export const INGREDIENT_LABELS: Record<Ingredient, string> = {
  fleur_bissap: "Fleur de bissap",
  sucre: "Sucre",
  arome: "Arôme",
  ananas: "Ananas (frais)",
  gingembre: "Gingembre (frais)",
  menthe: "Menthe (fraîche)",
};

export function isIngredientObligatoire(i: Ingredient): boolean {
  return (INGREDIENTS_OBLIGATOIRES as readonly string[]).includes(i);
}

/**
 * Indique si un produit (selon sa gamme) doit avoir une saisie d'ingredients.
 * Aujourd'hui : seule la gamme `bissapa` est concernee.
 */
export function gammeAvecIngredients(gamme: string): boolean {
  return gamme === "bissapa";
}
