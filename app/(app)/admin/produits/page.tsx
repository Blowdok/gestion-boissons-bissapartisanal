import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatEUR } from "@/lib/utils/format";
import { GAMME_LABELS, type Gamme } from "./schemas";
import { ProduitStatutToggle } from "./statut-toggle";

export const metadata = { title: "Catalogue produits · Admin" };

export default async function ProduitsAdminPage() {
  const { supabase } = await requireRole("patron");

  const { data: produits } = await supabase
    .from("produits")
    .select("id, nom, gamme, format, seuil_alerte, prix_defaut_ht, actif")
    .order("gamme")
    .order("nom");

  return (
    <div>
      <Link
        href="/admin"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à l&apos;administration
      </Link>

      <PageHeader
        title="Catalogue produits"
        description="Gestion des références Bissapa et Zandjabila."
        actions={
          <Link
            href="/admin/produits/nouveau"
            className={buttonVariants({ size: "default" })}
          >
            <Plus className="size-4" />
            Nouveau produit
          </Link>
        }
      />

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Gamme</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Prix HT</TableHead>
              <TableHead className="text-right">Seuil</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produits && produits.length > 0 ? (
              produits.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nom}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {GAMME_LABELS[p.gamme as Gamme]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.format}</TableCell>
                  <TableCell className="text-right">
                    {formatEUR(Number(p.prix_defaut_ht))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.seuil_alerte}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.actif ? (
                      <Badge variant="secondary">Actif</Badge>
                    ) : (
                      <Badge variant="outline">Inactif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/produits/${p.id}/edit`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        })}
                        aria-label="Modifier"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ProduitStatutToggle
                        id={p.id}
                        actif={p.actif}
                        nom={p.nom}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucun produit.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
