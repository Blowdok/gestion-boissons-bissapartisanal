"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  resetDonneesOperationnelles,
  type ResetStats,
} from "./actions";

export function ResetForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [motCle, setMotCle] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [stats, setStats] = useState<ResetStats | null>(null);

  const peutLancer = motCle.trim() === "RESET";

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label htmlFor="mot-cle">
            Pour confirmer, saisis le mot-clé{" "}
            <strong className="font-mono">RESET</strong> en majuscules :
          </Label>
          <Input
            id="mot-cle"
            type="text"
            value={motCle}
            onChange={(e) => setMotCle(e.target.value)}
            placeholder="RESET"
            autoComplete="off"
            className="mt-2 max-w-xs font-mono"
            disabled={pending}
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={!peutLancer || pending}
          onClick={() => setConfirmation(true)}
        >
          <AlertTriangle className="size-4" />
          Réinitialiser les données opérationnelles
        </Button>
      </div>

      <AlertDialog open={confirmation} onOpenChange={setConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dernière confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>
                Toutes les livraisons, factures, paiements, lots, mouvements
                de stock, ingrédients tracés et dépenses vont être supprimés.
              </strong>
              <br /><br />
              Les utilisateurs, clients, produits, tarifs négociés et
              configuration sont conservés. La numérotation des factures
              repart à FAC-AAAA-00001.
              <br /><br />
              <strong className="text-destructive">
                Cette action est irréversible. Aucune restauration possible.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmation(false);
                start(async () => {
                  const res = await resetDonneesOperationnelles(motCle.trim());
                  if (!res.ok) {
                    toast.error(`Échec : ${res.error}`);
                    return;
                  }
                  setStats(res.stats);
                  setMotCle("");
                  toast.success("Données opérationnelles remises à zéro.");
                  router.refresh();
                });
              }}
            >
              {pending ? "Réinitialisation…" : "Oui, tout effacer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {stats ? (
        <div className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Reset effectué. Lignes supprimées :
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-emerald-900 dark:text-emerald-100">
            <li>Paiements clients : {stats.paiements}</li>
            <li>Factures : {stats.factures}</li>
            <li>Livraisons : {stats.livraisons}</li>
            <li>Lignes livraison : {stats.lignes_livraison}</li>
            <li>Lots : {stats.lots}</li>
            <li>Mouvements stock : {stats.mouvements_stock}</li>
            <li>Ingrédients tracés : {stats.lot_ingredients}</li>
            <li>Dépenses : {stats.depenses}</li>
            <li>Paiements dépenses : {stats.paiements_depense}</li>
          </ul>
        </div>
      ) : null}
    </>
  );
}
