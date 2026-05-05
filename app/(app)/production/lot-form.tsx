"use client";

import { useActionState } from "react";
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
import { createLot, type ActionState } from "./actions";

type Produit = {
  id: string;
  nom: string;
  gamme: string;
  format: string;
};

const GAMME_LABEL: Record<string, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export function LotForm({ produits }: { produits: Produit[] }) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createLot,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  const today = new Date().toISOString().slice(0, 10);
  // DLUO par defaut : production + 6 mois (a ajuster selon le metier)
  const dluoDefault = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="produit_id">Produit *</Label>
          <Select name="produit_id" disabled={pending}>
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
            Date Limite d&apos;Utilisation Optimale.
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
            placeholder="Particularités, ingrédient batch, etc."
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          />
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le lot"}
      </Button>
    </form>
  );
}
