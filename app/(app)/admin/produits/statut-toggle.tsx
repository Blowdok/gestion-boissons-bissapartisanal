"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
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
import { toggleProduitActif } from "./actions";

export function ProduitStatutToggle({
  id,
  actif,
  nom,
}: {
  id: string;
  actif: boolean;
  nom: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  if (!actif) {
    // Reactivation : pas de confirmation
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toggleProduitActif(id, true);
            router.refresh();
          })
        }
        aria-label="Réactiver"
      >
        <Power className="size-4 text-emerald-600" />
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label="Désactiver"
          >
            <Power className="size-4 text-destructive" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Désactiver {nom} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le produit n&apos;apparaîtra plus dans les listes par défaut et ne
            sera plus proposé pour les nouvelles livraisons. Les lots, livraisons
            et factures historiques sont conservés. Tu peux le réactiver à tout
            moment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                await toggleProduitActif(id, false);
                router.refresh();
              })
            }
          >
            Désactiver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
