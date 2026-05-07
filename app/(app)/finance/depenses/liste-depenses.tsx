"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import {
  SOURCE_LABELS,
  STATUT_DEPENSE_LABELS,
  type SourceFonds,
  type StatutPaiementDepense,
} from "@/lib/domain/source-fonds";
import { getJustificatifUrl, supprimerDepense } from "./actions";

type Depense = {
  id: string;
  date: string;
  montant_total: number;
  reste_a_payer: number;
  categorie: CategorieDepense;
  source_fonds: SourceFonds;
  description: string | null;
  justificatif_path: string | null;
  statut_paiement: StatutPaiementDepense;
};

const STATUT_BADGE: Record<
  StatutPaiementDepense,
  "default" | "secondary" | "destructive" | "outline"
> = {
  paye: "default",
  partiel: "secondary",
  prevu: "outline",
  a_payer: "destructive",
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
              <TableHead>Enveloppe</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depenses.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-muted-foreground">
                  <Link
                    href={`/finance/depenses/${d.id}`}
                    className="hover:underline"
                  >
                    {formatDate(d.date)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {CATEGORIE_LABELS[d.categorie]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {SOURCE_LABELS[d.source_fonds]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <Link
                    href={`/finance/depenses/${d.id}`}
                    className="hover:underline"
                  >
                    {d.description ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <div>{formatEUR(d.montant_total)}</div>
                  {d.reste_a_payer > 0.01 ? (
                    <div className="text-xs font-normal text-amber-600">
                      reste {formatEUR(d.reste_a_payer)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUT_BADGE[d.statut_paiement]}
                    className="text-xs"
                  >
                    {STATUT_DEPENSE_LABELS[d.statut_paiement]}
                  </Badge>
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
              Action irréversible. Tous les paiements rattachés et le
              justificatif éventuel seront également supprimés.
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
