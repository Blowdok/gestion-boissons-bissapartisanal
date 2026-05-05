import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Production · Gestion Boissons" };

export default async function ProductionPage() {
  const { supabase } = await requireRole("patron", "fabrication");

  const { data: lots } = await supabase
    .from("lots")
    .select("id, date_production, dluo, qte_produite, numero_lot, produits(nom, gamme, format)")
    .order("date_production", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Production"
        description="Saisie et historique des lots de production."
        actions={
          <Link
            href="/production/nouveau"
            className={buttonVariants({ size: "default" })}
          >
            <Plus className="size-4" />
            Nouveau lot
          </Link>
        }
      />

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date production</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>N° lot</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead>DLUO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots && lots.length > 0 ? (
              lots.map((l) => {
                // produits peut etre un objet (FK) ou un tableau selon le typage Supabase
                const produit = Array.isArray(l.produits) ? l.produits[0] : l.produits;
                const dluoPassee = new Date(l.dluo) < new Date(new Date().toDateString());
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(l.date_production)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/stock/lots/${l.id}`}
                        className="hover:underline"
                      >
                        {produit?.nom ?? "—"}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {produit?.format}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {l.numero_lot ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{l.qte_produite}</TableCell>
                    <TableCell>
                      {formatDate(l.dluo)}
                      {dluoPassee ? (
                        <Badge variant="destructive" className="ml-2">
                          Dépassée
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun lot enregistré pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
