"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { annulerFacture } from "../actions";

export function FactureAnnuler({
  factureId,
  numero,
  aPaiements,
}: {
  factureId: string;
  numero: string;
  aPaiements: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="default" disabled={pending}>
            <Ban className="size-4 text-destructive" />
            Annuler la facture
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler la facture {numero} ?</AlertDialogTitle>
          <AlertDialogDescription>
            La facture reste consultable mais sort des totaux (CA, dashboard,
            top clients). La livraison liée passe en « Annulée ».
            {aPaiements ? (
              <>
                <br /><br />
                <strong className="text-destructive">
                  Attention : cette facture a des paiements enregistrés.
                </strong>{" "}
                Ils seront supprimés (équivalent à un avoir global).
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <label
            htmlFor="motif-annulation"
            className="text-sm font-medium"
          >
            Motif (optionnel)
          </label>
          <input
            id="motif-annulation"
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="ex : erreur de saisie, retour client…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Garder</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              start(async () => {
                const res = await annulerFacture(factureId, motif);
                if (!res.ok) {
                  toast.error(`Échec : ${res.error}`);
                  return;
                }
                toast.success("Facture annulée.");
                setMotif("");
                router.refresh();
              });
            }}
          >
            {pending ? "Annulation…" : "Annuler la facture"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
