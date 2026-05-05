"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { supprimerPaiement } from "../actions";

export function DeletePaiementButton({
  id,
  montant,
  mode,
}: {
  id: string;
  montant: string;
  mode: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={() => setOpen(true)}
        aria-label="Supprimer le paiement"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu es sur le point de supprimer le paiement de <strong>{montant}</strong> en {mode}.
            Cette opération est irréversible. Elle est tracée dans le journal d&apos;audit.
            Si la facture était marquée payée, son statut redeviendra
            « partielle » ou « impayée ».
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              start(async () => {
                try {
                  await supprimerPaiement(id);
                  router.refresh();
                  toast.success("Paiement supprimé.");
                } catch (e) {
                  toast.error(`Échec : ${(e as Error).message}`);
                }
              });
            }}
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
