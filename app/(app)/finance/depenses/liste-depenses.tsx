"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatDate, formatEUR } from "@/lib/utils/format";
import { CATEGORIE_LABELS, type CategorieDepense } from "./schemas";
import { getJustificatifUrl, supprimerDepense } from "./actions";

type Depense = {
  id: string;
  date: string;
  montant: number;
  categorie: CategorieDepense;
  description: string | null;
  justificatif_path: string | null;
};

export function ListeDepenses({ depenses }: { depenses: Depense[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const voirJustificatif = async (path: string) => {
    const url = await getJustificatifUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Justificatif introuvable.");
  };

  const supprimer = (id: string) =>
    start(async () => {
      try {
        await supprimerDepense(id);
        router.refresh();
        toast.success("Dépense supprimée.");
      } catch (e) {
        toast.error(`Échec : ${(e as Error).message}`);
      }
    });

  if (depenses.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aucune dépense saisie pour le moment.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depenses.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(d.date)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {CATEGORIE_LABELS[d.categorie]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.description ?? "—"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatEUR(d.montant)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {d.justificatif_path ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        onClick={() => voirJustificatif(d.justificatif_path!)}
                        aria-label="Voir le justificatif"
                      >
                        <Eye className="size-4" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => setConfirmId(d.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Le justificatif éventuel sera également
              supprimé du stockage.
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
    </>
  );
}
