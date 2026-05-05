"use client";

import { useActionState, useEffect, useState } from "react";
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
import { updateLivraisonMetadata, type ActionState } from "../../actions";

type Initial = {
  date_prevue: string;
  livreur_id: string | null;
  notes: string | null;
};

export function EditLivraisonForm({
  id,
  initial,
  livreurs,
}: {
  id: string;
  initial: Initial;
  livreurs: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const action = updateLivraisonMetadata.bind(null, id);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  // Inputs controles : evite le warning Base UI sur les defaultValue
  const [datePrevue, setDatePrevue] = useState<string>(initial.date_prevue);
  const [livreurId, setLivreurId] = useState<string>(initial.livreur_id ?? "");
  const [notes, setNotes] = useState<string>(initial.notes ?? "");

  useEffect(() => {
    if (!state) return;
    if (!state.error && !state.fieldErrors) {
      toast.success("Livraison mise à jour.");
      router.push(`/livraisons/${id}`);
    }
  }, [state, router, id]);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date_prevue">Date prévue *</Label>
          <Input
            id="date_prevue"
            name="date_prevue"
            type="date"
            required
            value={datePrevue}
            onChange={(e) => setDatePrevue(e.target.value)}
            className="mt-2"
            disabled={pending}
          />
          {fe.date_prevue ? (
            <p className="mt-1 text-xs text-destructive">{fe.date_prevue}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="livreur_id">Livreur</Label>
          <Select
            name="livreur_id"
            value={livreurId}
            onValueChange={(v) => setLivreurId(v ?? "")}
            disabled={pending}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Non assigné</SelectItem>
              {livreurs.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
