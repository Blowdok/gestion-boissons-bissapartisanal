"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toggleProduitActif, supprimerProduit } from "./actions";

export function ProduitActions({
  id,
  nom,
  actif,
}: {
  id: string;
  nom: string;
  actif: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const performToggle = (newActif: boolean) => {
    start(async () => {
      try {
        await toggleProduitActif(id, newActif);
        router.refresh();
        toast.success(newActif ? `${nom} réactivé.` : `${nom} désactivé.`);
      } catch (e) {
        toast.error(`Échec : ${(e as Error).message}`);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Actions" disabled={pending}>
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/admin/produits/${id}/edit`} />}>
            <Pencil className="size-4" />
            Modifier
          </DropdownMenuItem>

          {actif ? (
            <DropdownMenuItem onClick={() => setConfirmDeactivate(true)}>
              <PowerOff className="size-4" />
              Désactiver
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => performToggle(true)}>
              <Power className="size-4 text-emerald-600" />
              Réactiver
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4 text-destructive" />
            <span className="text-destructive">Supprimer définitivement</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation desactivation */}
      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver {nom} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le produit n&apos;apparaîtra plus dans les listes par défaut et ne
              sera plus proposé pour les nouvelles livraisons. Les lots et
              factures historiques sont conservés. Tu peux le réactiver à tout
              moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDeactivate(false);
                performToggle(false);
              }}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation suppression definitive */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {nom} définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Les tarifs négociés associés seront aussi
              supprimés. Si le produit a déjà été utilisé dans un lot ou une
              livraison (Phase 2/3), la suppression sera refusée — préfère
              alors la désactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                start(async () => {
                  try {
                    await supprimerProduit(id);
                    router.refresh();
                    toast.success(`${nom} supprimé.`);
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
    </>
  );
}
