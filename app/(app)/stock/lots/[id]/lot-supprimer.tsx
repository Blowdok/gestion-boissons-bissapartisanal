"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { supprimerLot } from "./actions";

export function LotSupprimer({
  id,
  nomProduit,
  consomme,
}: {
  id: string;
  nomProduit: string;
  consomme: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (consomme) {
    return (
      <Button
        variant="outline"
        size="default"
        disabled
        title="Lot deja entame (livraisons ou pertes enregistrees)"
      >
        <Trash2 className="size-4" />
        Supprimer
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="default" disabled={pending}>
            <Trash2 className="size-4 text-destructive" />
            Supprimer
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce lot ?</AlertDialogTitle>
          <AlertDialogDescription>
            Suppression définitive du lot {nomProduit} et de sa traçabilité
            ingrédients. Aucune livraison ni perte enregistrée pour ce lot :
            l&apos;opération est sûre mais irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erreur ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erreur}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setErreur(null);
              start(async () => {
                const res = await supprimerLot(id);
                if (!res.ok) {
                  setErreur(res.error);
                  return;
                }
                setOpen(false);
                router.push("/stock");
                router.refresh();
              });
            }}
          >
            {pending ? "Suppression…" : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
