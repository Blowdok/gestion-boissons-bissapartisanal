"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { toggleClientActif } from "../actions";

export function ClientStatutToggle({
  id,
  actif,
  raisonSociale,
}: {
  id: string;
  actif: boolean;
  raisonSociale: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  // La reactivation n'a pas besoin de confirmation (action benigne)
  if (!actif) {
    return (
      <Button
        variant="default"
        size="default"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toggleClientActif(id, true);
            router.refresh();
          })
        }
      >
        {pending ? "…" : "Réactiver"}
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="default" disabled={pending}>
            {pending ? "…" : "Désactiver"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Désactiver {raisonSociale} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le client n&apos;apparaîtra plus dans les listes par défaut et ne
            sera plus proposé pour les nouvelles livraisons. L&apos;historique
            des livraisons et factures est conservé. Tu pourras réactiver le
            client à tout moment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                await toggleClientActif(id, false);
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
