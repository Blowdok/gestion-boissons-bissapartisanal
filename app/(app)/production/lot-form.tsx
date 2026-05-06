"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  gammeAvecIngredients,
  INGREDIENTS_NATURELS,
  INGREDIENTS_SECS,
  INGREDIENT_LABELS,
  type Ingredient,
  type IngredientNaturel,
} from "@/lib/domain/ingredients";
import { createLot, type ActionState } from "./actions";

type Produit = {
  id: string;
  nom: string;
  gamme: string;
  format: string;
};

type IngredientLigne = {
  nom: Ingredient;
  date_peremption: string;
};

const GAMME_LABEL: Record<string, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export function LotForm({ produits }: { produits: Produit[] }) {
  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(createLot, undefined);
  const fe = state?.fieldErrors ?? {};

  const [produitId, setProduitId] = useState<string>("");
  const produitSelectionne = useMemo(
    () => produits.find((p) => p.id === produitId),
    [produits, produitId],
  );
  const afficherIngredients = produitSelectionne
    ? gammeAvecIngredients(produitSelectionne.gamme)
    : false;

  // Initialisation : 3 lignes secs preremplies des qu'on est sur un Bissapa
  const [ingredients, setIngredients] = useState<IngredientLigne[]>(() =>
    INGREDIENTS_SECS.map((nom) => ({ nom, date_peremption: "" })),
  );

  const updateLigne = (index: number, patch: Partial<IngredientLigne>) => {
    setIngredients((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };

  const ajouterIngredientNaturel = (nom: IngredientNaturel) => {
    setIngredients((prev) => [...prev, { nom, date_peremption: "" }]);
  };

  const supprimerLigne = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Naturels deja ajoutes -> retires de la liste de selection
  const naturelsDisponibles = INGREDIENTS_NATURELS.filter(
    (n) => !ingredients.some((i) => i.nom === n),
  );

  const today = new Date().toISOString().slice(0, 10);
  const dluoDefault = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  })();

  // On envoie la liste serialisee uniquement si applicable, sinon "[]"
  const ingredientsPourSubmit = afficherIngredients ? ingredients : [];

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(ingredientsPourSubmit)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="produit_id">Produit *</Label>
          <Select
            name="produit_id"
            value={produitId}
            onValueChange={(v) => setProduitId(v ?? "")}
            disabled={pending}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sélectionner un produit" />
            </SelectTrigger>
            <SelectContent>
              {produits.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom} — {GAMME_LABEL[p.gamme] ?? p.gamme} {p.format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.produit_id ? (
            <p className="mt-1 text-xs text-destructive">{fe.produit_id}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="date_production">Date de production *</Label>
          <Input
            id="date_production"
            name="date_production"
            type="date"
            required
            defaultValue={today}
            max={today}
            className="mt-2"
            disabled={pending}
          />
          {fe.date_production ? (
            <p className="mt-1 text-xs text-destructive">{fe.date_production}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="dluo">DLUO *</Label>
          <Input
            id="dluo"
            name="dluo"
            type="date"
            required
            defaultValue={dluoDefault}
            className="mt-2"
            disabled={pending}
          />
          {fe.dluo ? <p className="mt-1 text-xs text-destructive">{fe.dluo}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Date Limite d&apos;Utilisation Optimale du produit fini.
          </p>
        </div>

        <div>
          <Label htmlFor="qte_produite">Quantité produite *</Label>
          <Input
            id="qte_produite"
            name="qte_produite"
            type="number"
            min="1"
            step="1"
            required
            placeholder="ex : 200"
            className="mt-2"
            disabled={pending}
          />
          {fe.qte_produite ? (
            <p className="mt-1 text-xs text-destructive">{fe.qte_produite}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Nombre d&apos;unités (bouteilles ou shots).
          </p>
        </div>

        <div>
          <Label htmlFor="numero_lot">N° de lot interne (optionnel)</Label>
          <Input
            id="numero_lot"
            name="numero_lot"
            placeholder="ex : 2026-W12-A"
            className="mt-2"
            disabled={pending}
          />
          {fe.numero_lot ? (
            <p className="mt-1 text-xs text-destructive">{fe.numero_lot}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Particularités de production, observations…"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          />
        </div>
      </div>

      {afficherIngredients ? (
        <section className="rounded-lg border bg-muted/30 p-4">
          <header className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold">Ingrédients utilisés</h3>
              <p className="text-xs text-muted-foreground">
                Date de péremption de chaque ingrédient — traçabilité en cas
                de rappel fournisseur.
              </p>
            </div>
          </header>

          <div className="space-y-2">
            {ingredients.map((l, i) => {
              const sec = (INGREDIENTS_SECS as readonly string[]).includes(
                l.nom,
              );
              return (
                <div
                  key={`${l.nom}-${i}`}
                  className="grid grid-cols-[1fr_auto_auto] items-end gap-2"
                >
                  <div>
                    <Label className="text-xs">Ingrédient</Label>
                    <div className="mt-1 rounded-md border bg-background px-3 py-2 text-sm">
                      {INGREDIENT_LABELS[l.nom]}
                      {sec ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (obligatoire)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor={`dluo_${i}`}
                      className="text-xs"
                    >
                      Péremption *
                    </Label>
                    <Input
                      id={`dluo_${i}`}
                      type="date"
                      required
                      value={l.date_peremption}
                      onChange={(e) =>
                        updateLigne(i, { date_peremption: e.target.value })
                      }
                      className="mt-1"
                      disabled={pending}
                    />
                  </div>
                  <div>
                    {/* Les secs ne sont pas supprimables, les naturels oui */}
                    {sec ? (
                      <div className="size-9" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => supprimerLigne(i)}
                        disabled={pending}
                        aria-label="Retirer cet ingrédient"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {naturelsDisponibles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <span className="self-center text-xs text-muted-foreground">
                Ajouter un ingrédient naturel :
              </span>
              {naturelsDisponibles.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ajouterIngredientNaturel(n)}
                  disabled={pending}
                >
                  <Plus className="size-3" />
                  {INGREDIENT_LABELS[n]}
                </Button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !produitId}>
        {pending ? "Enregistrement…" : "Enregistrer le lot"}
      </Button>
    </form>
  );
}
