"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEUR } from "@/lib/utils/format";
import { upsertTarif, deleteTarif } from "../actions";

type ProduitLigne = {
  id: string;
  nom: string;
  gamme: "bissapa" | "zandjabila";
  format: string;
  prix_defaut_ht: number;
  prix_negocie: number | null;
};

const GAMME_LABEL: Record<ProduitLigne["gamme"], string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export function TarifsEditor({
  clientId,
  canWrite,
  produits,
}: {
  clientId: string;
  canWrite: boolean;
  produits: ProduitLigne[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifs négociés</CardTitle>
        <CardDescription>
          Prix appliqués à ce client. Si vide, le prix par défaut du produit est
          utilisé en livraison.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Gamme</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Prix par défaut</TableHead>
              <TableHead>Prix négocié</TableHead>
              {canWrite ? <TableHead className="w-24"></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {produits.map((p) => (
              <TarifRow
                key={p.id}
                clientId={clientId}
                produit={p}
                canWrite={canWrite}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TarifRow({
  clientId,
  produit,
  canWrite,
}: {
  clientId: string;
  produit: ProduitLigne;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(
    produit.prix_negocie != null ? produit.prix_negocie.toFixed(2) : "",
  );
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty =
    (produit.prix_negocie ?? null) !==
    (value === "" ? null : Number.parseFloat(value));

  return (
    <TableRow>
      <TableCell className="font-medium">{produit.nom}</TableCell>
      <TableCell className="text-muted-foreground">{GAMME_LABEL[produit.gamme]}</TableCell>
      <TableCell className="text-muted-foreground">{produit.format}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {formatEUR(produit.prix_defaut_ht)}
      </TableCell>
      <TableCell>
        {canWrite ? (
          <form
            action={(formData) => {
              const v = String(formData.get("prix_ht") ?? "").trim();
              if (v === "") return;
              formData.set("produit_id", produit.id);
              start(async () => {
                await upsertTarif(clientId, formData);
                router.refresh();
              });
            }}
            className="flex items-center gap-2"
          >
            <Input
              name="prix_ht"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="—"
              className="max-w-[8rem]"
              disabled={pending}
            />
            <Button type="submit" size="sm" disabled={pending || !dirty || value === ""}>
              {pending ? "…" : "Enregistrer"}
            </Button>
          </form>
        ) : produit.prix_negocie != null ? (
          formatEUR(produit.prix_negocie)
        ) : (
          <span className="text-muted-foreground">— (par défaut)</span>
        )}
      </TableCell>
      {canWrite ? (
        <TableCell className="text-right">
          {produit.prix_negocie != null ? (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label="Supprimer le tarif"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le tarif négocié ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le prix par défaut ({formatEUR(produit.prix_defaut_ht)}) sera
                    appliqué à ce client pour <strong>{produit.nom}</strong> à
                    partir des prochaines livraisons.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      start(async () => {
                        await deleteTarif(clientId, produit.id);
                        setValue("");
                        router.refresh();
                      });
                    }}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}
