"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import {
  gammeAvecIngredients,
  INGREDIENTS_SECS,
} from "@/lib/domain/ingredients";
import { lotSchema } from "./schemas";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrors(error: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createLot(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireRole(
    "patron",
    "adjoint",
    "fabrication",
  );

  // Le champ 'ingredients' est envoye en JSON serialise par le formulaire
  let ingredientsParsed: unknown = [];
  const ingredientsRaw = formData.get("ingredients");
  if (typeof ingredientsRaw === "string" && ingredientsRaw.trim() !== "") {
    try {
      ingredientsParsed = JSON.parse(ingredientsRaw);
    } catch {
      return { error: "Liste d'ingrédients mal formée." };
    }
  }

  const parsed = lotSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    ingredients: ingredientsParsed,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { numero_lot, notes, ingredients, ...rest } = parsed.data;

  // Verification metier : pour les Bissapa, les ingredients secs sont obligatoires
  const { data: produit } = await supabase
    .from("produits")
    .select("gamme")
    .eq("id", rest.produit_id)
    .maybeSingle();

  if (produit && gammeAvecIngredients(produit.gamme)) {
    const nomsRecus = new Set(ingredients.map((i) => i.nom));
    const secsManquants = INGREDIENTS_SECS.filter((s) => !nomsRecus.has(s));
    if (secsManquants.length > 0) {
      return {
        error:
          "Ingrédients secs obligatoires manquants pour un Bissapa : " +
          secsManquants.join(", ") +
          ".",
      };
    }
  }

  const { data, error } = await supabase
    .from("lots")
    .insert({
      ...rest,
      numero_lot: numero_lot || null,
      notes: notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insertion des ingredients (uniquement si applicable)
  if (ingredients.length > 0) {
    const { error: errIng } = await supabase.from("lot_ingredients").insert(
      ingredients.map((i) => ({
        lot_id: data.id,
        nom: i.nom,
        date_peremption: i.date_peremption,
      })),
    );
    if (errIng) {
      // Rollback du lot pour rester coherent (le lot ne doit pas exister
      // sans ses ingredients sur un Bissapa)
      await supabase.from("lots").delete().eq("id", data.id);
      return {
        error: "Échec d'enregistrement des ingrédients : " + errIng.message,
      };
    }
  }

  revalidatePath("/production");
  revalidatePath("/stock");
  revalidatePath(`/stock/lots/${data.id}`);
  redirect("/production");
}
