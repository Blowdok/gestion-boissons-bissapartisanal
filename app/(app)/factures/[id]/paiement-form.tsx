"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { enregistrerPaiement, type ActionState } from "../actions";
import { MODES_PAIEMENT, MODE_LABEL } from "../schemas";

export function PaiementForm({
  factureId,
  soldeRestant,
}: {
  factureId: string;
  soldeRestant: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    enregistrerPaiement,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  // Toast + reset apres succes (pas d'erreur ni fieldErrors)
  useEffect(() => {
    if (!state) return;
    if (!state.error && !state.fieldErrors) {
      toast.success("Paiement enregistré.");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-4">
      <input type="hidden" name="facture_id" value={factureId} />

      <div>
        <Label htmlFor="montant">Montant *</Label>
        <Input
          id="montant"
          name="montant"
          type="number"
          step="0.01"
          min="0.01"
          max={soldeRestant}
          required
          defaultValue={soldeRestant.toFixed(2)}
          className="mt-2"
          disabled={pending}
        />
        {fe.montant ? <p className="mt-1 text-xs text-destructive">{fe.montant}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          Solde {soldeRestant.toFixed(2)} €
        </p>
      </div>

      <div>
        <Label htmlFor="mode">Mode *</Label>
        <Select name="mode" defaultValue="virement" disabled={pending}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES_PAIEMENT.map((m) => (
              <SelectItem key={m} value={m}>
                {MODE_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date_encaissement">Date *</Label>
        <Input
          id="date_encaissement"
          name="date_encaissement"
          type="date"
          required
          defaultValue={today}
          max={today}
          className="mt-2"
          disabled={pending}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Référence chèque, etc."
          className="mt-2"
          disabled={pending}
        />
      </div>

      {state?.error ? (
        <p className="sm:col-span-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer le paiement"}
        </Button>
      </div>
    </form>
  );
}
