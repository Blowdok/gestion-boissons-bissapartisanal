import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
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

export const metadata = { title: "Stock · Gestion Boissons" };

const GAMME_LABEL: Record<string, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export default async function StockPage() {
  const { profile, supabase } = await requireRole("patron", "fabrication", "livreur");
  const canProduire = profile.role === "patron" || profile.role === "fabrication";

  const { data: stock } = await supabase
    .from("stock_par_produit")
    .select("produit_id, nom, gamme, format, seuil_alerte, qte_disponible, qte_dluo_passee, nb_lots_actifs, actif")
    .eq("actif", true)
    .order("gamme")
    .order("nom");

  const totalDisponible = stock?.reduce((acc, s) => acc + (s.qte_disponible ?? 0), 0) ?? 0;
  const enAlerte = stock?.filter((s) => (s.qte_disponible ?? 0) < (s.seuil_alerte ?? 0)) ?? [];

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Vue temps réel par produit. Alertes seuil et lots disponibles."
        actions={
          canProduire ? (
            <Link
              href="/production/nouveau"
              className={buttonVariants({ size: "default" })}
            >
              <Plus className="size-4" />
              Nouveau lot
            </Link>
          ) : null
        }
      />

      {/* KPIs simples */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total en stock" value={totalDisponible.toLocaleString("fr-FR")} sub="unités vendables" />
        <KpiCard
          label="Produits en alerte"
          value={String(enAlerte.length)}
          sub={enAlerte.length > 0 ? "sous le seuil" : "RAS"}
          tone={enAlerte.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Références au catalogue"
          value={String(stock?.length ?? 0)}
          sub="produits actifs"
        />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Gamme</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead className="text-right">Seuil</TableHead>
              <TableHead className="text-right">Lots actifs</TableHead>
              <TableHead className="text-right">DLUO dépassée</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock && stock.length > 0 ? (
              stock.map((s) => {
                const enAlerte = (s.qte_disponible ?? 0) < (s.seuil_alerte ?? 0);
                return (
                  <TableRow key={s.produit_id}>
                    <TableCell className="font-medium">{s.nom}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {GAMME_LABEL[s.gamme] ?? s.gamme}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.format}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          enAlerte
                            ? "font-semibold text-destructive"
                            : "font-semibold"
                        }
                      >
                        {s.qte_disponible ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {s.seuil_alerte ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {s.nb_lots_actifs ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {s.qte_dluo_passee ? (
                        <Badge variant="destructive">{s.qte_dluo_passee}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {enAlerte ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Alerte
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Aucun produit. Démarre par créer un lot dans Production.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-1 text-2xl font-semibold tracking-tight " +
          (tone === "warning" ? "text-destructive" : "")
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
