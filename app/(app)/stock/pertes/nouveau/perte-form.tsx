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
import { declarerPerte, type ActionState } from "../actions";
import { MOTIFS_PERTE, MOTIF_LABEL } from "../schemas";

type LotOption = {
  id: string;
  qte_disponible: number;
  label: string;
};

export function PerteForm({
  lots,
  preselectedLotId,
}: {
  lots: LotOption[];
  preselectedLotId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    declarerPerte,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  if (lots.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucun lot avec du stock disponible. Les pertes ne peuvent être saisies
        que sur des lots qui ont encore des unités.
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="lot_id">Lot concerné *</Label>
          <Select name="lot_id" defaultValue={preselectedLotId} disabled={pending}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sélectionner un lot" />
            </SelectTrigger>
            <SelectContent>
              {lots.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.lot_id ? <p className="mt-1 text-xs text-destructive">{fe.lot_id}</p> : null}
        </div>

        <div>
          <Label htmlFor="motif">Motif *</Label>
          <Select name="motif" defaultValue="casse" disabled={pending}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOTIFS_PERTE.map((m) => (
                <SelectItem key={m} value={m}>
                  {MOTIF_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.motif ? <p className="mt-1 text-xs text-destructive">{fe.motif}</p> : null}
        </div>

        <div>
          <Label htmlFor="qte">Quantité perdue *</Label>
          <Input
            id="qte"
            name="qte"
            type="number"
            min="1"
            step="1"
            required
            placeholder="ex : 5"
            className="mt-2"
            disabled={pending}
          />
          {fe.qte ? <p className="mt-1 text-xs text-destructive">{fe.qte}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Détail de la casse, conditions du retour, etc."
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
        {pending ? "Enregistrement…" : "Déclarer la perte"}
      </Button>
    </form>
  );
}
