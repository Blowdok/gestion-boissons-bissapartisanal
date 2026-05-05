"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import { formatEUR } from "@/lib/utils/format";
import { enregistrerPaiement, type ActionState } from "../actions";
import { MODES_PAIEMENT, MODE_LABEL } from "../schemas";
import type { ModePaiement } from "../../livraisons/schemas";

type Ligne = {
  montant: string;
  mode: ModePaiement;
  notes: string;
};

const MAX_LIGNES = 5;

export function PaiementForm({
  factureId,
  soldeRestant,
}: {
  factureId: string;
  soldeRestant: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    enregistrerPaiement,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [lignes, setLignes] = useState<Ligne[]>([
    { montant: soldeRestant.toFixed(2), mode: "virement", notes: "" },
  ]);

  // Re-init quand le solde change (ex: paiement reussi)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLignes([{ montant: soldeRestant.toFixed(2), mode: "virement", notes: "" }]);
    setDate(today);
  }, [soldeRestant, today]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Toast apres succes
  useEffect(() => {
    if (!state) return;
    if (!state.error && !state.fieldErrors) {
      toast.success("Paiement enregistré.");
      router.refresh();
    }
  }, [state, router]);

  const total = lignes.reduce((acc, l) => acc + (parseFloat(l.montant) || 0), 0);
  const reste = soldeRestant - total;
  const enExces = total > soldeRestant + 0.001;

  function ajouterLigne() {
    if (lignes.length >= MAX_LIGNES) return;
    // Mode different par defaut pour faciliter le mixte
    const usedModes = new Set(lignes.map((l) => l.mode));
    const next = (MODES_PAIEMENT.find((m) => !usedModes.has(m)) ?? "especes") as ModePaiement;
    setLignes([
      ...lignes,
      {
        montant: Math.max(reste, 0).toFixed(2),
        mode: next,
        notes: "",
      },
    ]);
  }

  function updateLigne(i: number, patch: Partial<Ligne>) {
    setLignes((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );
  }

  function removeLigne(i: number) {
    if (lignes.length === 1) return;
    setLignes((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="facture_id" value={factureId} />
      <input type="hidden" name="date_encaissement" value={date} />
      <input type="hidden" name="lignes" value={JSON.stringify(lignes.map((l) => ({
        montant: parseFloat(l.montant) || 0,
        mode: l.mode,
        notes: l.notes,
      })))} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Date d&apos;encaissement *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
            className="mt-2"
            disabled={pending}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Une seule date pour toutes les lignes (paiement mixte le même jour).
          </p>
        </div>

        <div className="rounded-md border bg-muted/30 px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Solde de la facture</span>
            <span className="font-medium">{formatEUR(soldeRestant)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saisi</span>
            <span
              className={
                enExces
                  ? "font-medium text-destructive"
                  : "font-medium"
              }
            >
              {formatEUR(total)}
            </span>
          </div>
          <hr className="my-2 border-border" />
          <div className="flex justify-between text-sm">
            <span>Reste à encaisser</span>
            <span className="font-semibold">{formatEUR(Math.max(reste, 0))}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {lignes.map((l, i) => (
          <div
            key={i}
            className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-12"
          >
            <div className="sm:col-span-3">
              <Label htmlFor={`montant-${i}`} className="text-xs">
                Montant *
              </Label>
              <Input
                id={`montant-${i}`}
                type="number"
                step="0.01"
                min="0.01"
                max={soldeRestant}
                value={l.montant}
                onChange={(e) => updateLigne(i, { montant: e.target.value })}
                className="mt-1"
                disabled={pending}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor={`mode-${i}`} className="text-xs">
                Mode *
              </Label>
              <Select
                value={l.mode}
                onValueChange={(v) =>
                  updateLigne(i, { mode: (v ?? "virement") as ModePaiement })
                }
                disabled={pending}
              >
                <SelectTrigger className="mt-1">
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
            <div className="sm:col-span-5">
              <Label htmlFor={`notes-${i}`} className="text-xs">
                Notes
              </Label>
              <Input
                id={`notes-${i}`}
                placeholder="Référence, n° chèque…"
                value={l.notes}
                onChange={(e) => updateLigne(i, { notes: e.target.value })}
                className="mt-1"
                disabled={pending}
              />
            </div>
            <div className="flex items-end justify-end sm:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLigne(i)}
                disabled={pending || lignes.length === 1}
                aria-label="Retirer cette ligne"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={ajouterLigne}
          disabled={pending || lignes.length >= MAX_LIGNES || reste <= 0.001}
        >
          <Plus className="size-4" />
          Ajouter une ligne (paiement mixte)
        </Button>
        {lignes.length >= MAX_LIGNES ? (
          <span className="text-xs text-muted-foreground">
            Maximum {MAX_LIGNES} lignes.
          </span>
        ) : null}
      </div>

      {fe.montant ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {fe.montant}
        </p>
      ) : null}
      {fe.lignes ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {fe.lignes}
        </p>
      ) : null}
      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || enExces || total <= 0}>
        {pending
          ? "Enregistrement…"
          : `Enregistrer ${lignes.length > 1 ? `${lignes.length} paiements` : "le paiement"}`}
      </Button>
    </form>
  );
}
