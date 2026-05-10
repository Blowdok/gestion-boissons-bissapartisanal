"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mettreAJourTarifConsigne, type ActionState } from "./actions";

export function ParametresForm({
  tarifConsigneInitial,
  readonly,
}: {
  tarifConsigneInitial: number;
  readonly: boolean;
}) {
  const [tarif, setTarif] = useState(tarifConsigneInitial.toFixed(2));

  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(async (prev, fd) => {
    const r = await mettreAJourTarifConsigne(prev, fd);
    if (r.ok) toast.success("Tarif consigne mis à jour.");
    else if (r.error) toast.error(r.error);
    return r;
  }, undefined);

  useEffect(() => {
    setTarif(tarifConsigneInitial.toFixed(2));
  }, [tarifConsigneInitial]);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="tarif_consigne_eur">Tarif par bouteille / flacon (€)</Label>
        <Input
          id="tarif_consigne_eur"
          name="tarif_consigne_eur"
          type="number"
          step="0.01"
          min="0"
          max="10"
          required
          disabled={pending || readonly}
          value={tarif}
          onChange={(e) => setTarif(e.target.value)}
          className="mt-2 max-w-[160px]"
        />
        {state?.error ? (
          <p className="mt-1 text-xs text-destructive">{state.error}</p>
        ) : null}
      </div>

      {!readonly ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      ) : null}
    </form>
  );
}
