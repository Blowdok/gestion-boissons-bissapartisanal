"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, XCircle } from "lucide-react";
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
import { changerStatutLivraison } from "../actions";
import type { StatutLivraison } from "../schemas";

export function LivraisonStatusActions({
  id,
  statut,
  role,
}: {
  id: string;
  statut: StatutLivraison;
  role: "patron" | "adjoint" | "fabrication" | "livreur";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmLivree, setConfirmLivree] = useState(false);
  const [confirmAnnule, setConfirmAnnule] = useState(false);

  const exec = (target: StatutLivraison, label: string) =>
    start(async () => {
      try {
        await changerStatutLivraison(id, target);
        router.refresh();
        toast.success(label);
      } catch (e) {
        toast.error(`Échec : ${(e as Error).message}`);
      }
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {statut === "programmee" ? (
          <Button
            variant="secondary"
            size="default"
            disabled={pending}
            onClick={() => exec("en_cours", "Livraison en cours.")}
          >
            <PlayCircle className="size-4" />
            Démarrer
          </Button>
        ) : null}

        {(statut === "programmee" || statut === "en_cours") ? (
          <Button
            variant="default"
            size="default"
            disabled={pending}
            onClick={() => setConfirmLivree(true)}
          >
            <CheckCircle2 className="size-4" />
            Marquer livrée
          </Button>
        ) : null}

        {(statut === "programmee" || statut === "en_cours") && role !== "livreur" ? (
          <Button
            variant="outline"
            size="default"
            disabled={pending}
            onClick={() => setConfirmAnnule(true)}
          >
            <XCircle className="size-4" />
            Annuler
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmLivree} onOpenChange={setConfirmLivree}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer comme livrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une <strong>facture sera générée automatiquement</strong> avec un
              numéro séquentiel. Le stock a déjà été décrémenté à la création des
              lignes (FIFO sur DLUO).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLivree(false);
                exec("livree", "Livraison validée. Facture générée.");
              }}
            >
              Valider la livraison
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAnnule} onOpenChange={setConfirmAnnule}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              La livraison passe en statut <strong>« Annulée »</strong> et n&apos;est
              plus modifiable. Les mouvements de stock déjà enregistrés sont
              conservés (à compenser manuellement via un ajustement si besoin).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmAnnule(false);
                exec("annulee", "Livraison annulée.");
              }}
            >
              Annuler la livraison
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
