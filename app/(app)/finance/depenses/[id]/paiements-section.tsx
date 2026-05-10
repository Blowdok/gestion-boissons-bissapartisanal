"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEUR } from "@/lib/utils/format";
import {
  MODES_PAIEMENT_DEPENSE,
  MODE_DEPENSE_LABELS,
  type ModePaiementDepense,
} from "@/lib/domain/source-fonds";
import {
  ajouterPaiementDepense,
  marquerPaiementPaye,
  supprimerPaiementDepense,
  type ActionState,
} from "../actions";

type PaiementRow = {
  id: string;
  montant: number;
  date_prevue: string | null;
  date_effectif: string | null;
  mode: ModePaiementDepense;
  note: string | null;
};

type Props = {
  depenseId: string;
  montantTotal: number;
  resteAPayer: number;
  paiements: PaiementRow[];
  peutSupprimer: boolean;
};

export function PaiementsSection({
  depenseId,
  montantTotal,
  resteAPayer,
  paiements,
  peutSupprimer,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const actionWrap = async (
    _prev: ActionState | undefined,
    formData: FormData,
  ) => {
    formData.append("depense_id", depenseId);
    const r = await ajouterPaiementDepense(_prev, formData);
    if (!r.error && !r.fieldErrors) {
      toast.success("Paiement ajouté.");
      setShowForm(false);
      router.refresh();
    } else if (r.error) {
      toast.error(r.error);
    }
    return r;
  };

  const [state, formAction, formPending] = useActionState<
    ActionState | undefined,
    FormData
  >(actionWrap, undefined);
  const fe = state?.fieldErrors ?? {};

  const supprimer = (id: string) =>
    start(async () => {
      try {
        await supprimerPaiementDepense(id);
        toast.success("Paiement supprimé.");
        router.refresh();
      } catch (e) {
        toast.error(`Échec : ${(e as Error).message}`);
      }
    });

  const marquerPaye = (id: string) =>
    start(async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        await marquerPaiementPaye(id, today);
        toast.success("Paiement marqué comme effectif.");
        router.refresh();
      } catch (e) {
        toast.error(`Échec : ${(e as Error).message}`);
      }
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Paiements & échéances</CardTitle>
        {resteAPayer > 0.01 && !showForm ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            disabled={pending || formPending}
          >
            <Plus className="size-4" />
            Ajouter un paiement
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {showForm ? (
          <form
            action={formAction}
            className="mb-4 grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-12"
          >
            <div className="sm:col-span-2">
              <Label htmlFor="np_montant" className="text-xs">
                Montant € *
              </Label>
              <Input
                id="np_montant"
                name="montant"
                type="number"
                step="0.01"
                min="0.01"
                max={resteAPayer.toFixed(2)}
                defaultValue={resteAPayer > 0 ? resteAPayer.toFixed(2) : ""}
                required
                disabled={formPending}
                className="mt-1"
              />
              {fe.montant ? (
                <p className="mt-1 text-xs text-destructive">{fe.montant}</p>
              ) : null}
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="np_prevue" className="text-xs">
                Date prévue
              </Label>
              <Input
                id="np_prevue"
                name="date_prevue"
                type="date"
                disabled={formPending}
                className="mt-1"
              />
              {fe.date_prevue ? (
                <p className="mt-1 text-xs text-destructive">
                  {fe.date_prevue}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="np_effectif" className="text-xs">
                Date effective
              </Label>
              <Input
                id="np_effectif"
                name="date_effectif"
                type="date"
                disabled={formPending}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="np_mode" className="text-xs">
                Mode
              </Label>
              <Select name="mode" defaultValue="virement" disabled={formPending}>
                <SelectTrigger id="np_mode" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES_PAIEMENT_DEPENSE.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_DEPENSE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-12">
              <Label htmlFor="np_note" className="text-xs">
                Note (optionnelle)
              </Label>
              <Input
                id="np_note"
                name="note"
                type="text"
                placeholder="ex : 1ʳᵉ échéance, chèque n°123…"
                disabled={formPending}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-12">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                disabled={formPending}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={formPending}>
                {formPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
            {state?.error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-12">
                {state.error}
              </p>
            ) : null}
          </form>
        ) : null}

        {paiements.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun paiement enregistré pour cette dépense.
          </p>
        ) : (
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date prévue</TableHead>
                  <TableHead className="w-28">Date effective</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiements.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">
                      {p.date_prevue ? formatDate(p.date_prevue) : "—"}
                    </TableCell>
                    <TableCell>
                      {p.date_effectif ? (
                        <span className="font-medium text-emerald-700">
                          {formatDate(p.date_effectif)}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {MODE_DEPENSE_LABELS[p.mode]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatEUR(p.montant)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!p.date_effectif ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={pending}
                            onClick={() => marquerPaye(p.id)}
                            aria-label="Marquer comme payé"
                            title="Marquer comme payé aujourd'hui"
                          >
                            <Check className="size-4 text-emerald-700" />
                          </Button>
                        ) : null}
                        {peutSupprimer ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={pending}
                            onClick={() => setConfirmId(p.id)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Total dépense : <strong>{formatEUR(montantTotal)}</strong> · reste à
          payer : <strong>{formatEUR(resteAPayer)}</strong>
        </p>

        <AlertDialog
          open={confirmId !== null}
          onOpenChange={(o) => !o && setConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Action irréversible. Le statut de la dépense sera recalculé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const id = confirmId;
                  setConfirmId(null);
                  if (id) supprimer(id);
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
