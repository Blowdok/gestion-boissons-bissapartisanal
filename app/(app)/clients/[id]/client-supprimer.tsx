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
import { supprimerClient } from "../actions";

export function ClientSupprimer({
  id,
  raisonSociale,
  aDesLivraisons,
}: {
  id: string;
  raisonSociale: string;
  aDesLivraisons: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Si le client a un historique, on n'expose meme pas le bouton.
  // La desactivation reste possible via le toggle voisin.
  if (aDesLivraisons) {
    return (
      <Button
        variant="outline"
        size="default"
        disabled
        title="Suppression impossible : ce client a des livraisons. Utilise Désactiver."
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
          <AlertDialogTitle>Supprimer {raisonSociale} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Suppression définitive du client et de ses tarifs négociés. Aucune
            livraison ni facture liée n&apos;existe : cette action est sûre
            mais irréversible.
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
                const res = await supprimerClient(id);
                if (!res.ok) {
                  setErreur(res.error);
                  return;
                }
                setOpen(false);
                router.push("/clients");
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
