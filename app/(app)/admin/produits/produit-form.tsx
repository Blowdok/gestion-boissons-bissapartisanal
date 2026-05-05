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
import { GAMMES, GAMME_LABELS, type Gamme } from "./schemas";
import type { ActionState } from "./actions";

type Initial = {
  nom?: string;
  gamme?: Gamme;
  format?: string;
  seuil_alerte?: number;
  prix_defaut_ht?: number;
};

type Action = (
  state: ActionState | undefined,
  formData: FormData,
) => Promise<ActionState>;

export function ProduitForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Initial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="nom">Nom du produit *</Label>
          <Input
            id="nom"
            name="nom"
            required
            defaultValue={initial?.nom ?? ""}
            placeholder="ex : Bissap Hibiscus"
            className="mt-2"
            disabled={pending}
          />
          {fe.nom ? <p className="mt-1 text-xs text-destructive">{fe.nom}</p> : null}
        </div>

        <div>
          <Label htmlFor="gamme">Gamme *</Label>
          <Select
            name="gamme"
            defaultValue={initial?.gamme ?? "bissapa"}
            disabled={pending}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAMMES.map((g) => (
                <SelectItem key={g} value={g}>
                  {GAMME_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.gamme ? <p className="mt-1 text-xs text-destructive">{fe.gamme}</p> : null}
        </div>

        <div>
          <Label htmlFor="format">Format *</Label>
          <Input
            id="format"
            name="format"
            required
            defaultValue={initial?.format ?? "25cl"}
            placeholder="ex : 25cl, 60ml"
            className="mt-2"
            disabled={pending}
          />
          {fe.format ? <p className="mt-1 text-xs text-destructive">{fe.format}</p> : null}
        </div>

        <div>
          <Label htmlFor="prix_defaut_ht">Prix par défaut HT (€) *</Label>
          <Input
            id="prix_defaut_ht"
            name="prix_defaut_ht"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.prix_defaut_ht ?? ""}
            className="mt-2"
            disabled={pending}
          />
          {fe.prix_defaut_ht ? (
            <p className="mt-1 text-xs text-destructive">{fe.prix_defaut_ht}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="seuil_alerte">Seuil d&apos;alerte stock *</Label>
          <Input
            id="seuil_alerte"
            name="seuil_alerte"
            type="number"
            min="0"
            required
            defaultValue={initial?.seuil_alerte ?? 50}
            className="mt-2"
            disabled={pending}
          />
          {fe.seuil_alerte ? (
            <p className="mt-1 text-xs text-destructive">{fe.seuil_alerte}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Une alerte visuelle apparaîtra quand le stock total descend en
            dessous de cette valeur.
          </p>
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
