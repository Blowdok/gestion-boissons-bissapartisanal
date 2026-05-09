import Link from "next/link";
import { Plus, ChevronRight, AlertTriangle } from "lucide-react";
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

export const metadata = { title: "Production" };

type Lot = {
  id: string;
  date_production: string;
  dluo: string;
  qte_produite: number;
  numero_lot: string | null;
};

type StockLot = {
  qte_livree: number;
  qte_perdue: number;
  qte_disponible: number;
};

type GroupeProduit = {
  produit_id: string;
  nom: string;
  gamme: string;
  format: string;
  lots: Array<Lot & { stock: StockLot }>;
  totalProduit: number;
  totalLivree: number;
  totalPerdue: number;
  totalDisponible: number;
  prochaineDluo: string | null;
  aDluoDepassee: boolean;
};

const GAMME_LABEL: Record<string, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export default async function ProductionPage() {
  const { supabase } = await requireRole("patron", "adjoint", "fabrication");

  const [{ data: lots }, { data: stocks }] = await Promise.all([
    supabase
      .from("lots")
      .select(
        "id, date_production, dluo, qte_produite, numero_lot, produit_id, produits(nom, gamme, format)",
      )
      .order("date_production", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("stock_par_lot")
      .select("lot_id, qte_livree, qte_perdue, qte_disponible"),
  ]);

  const stockParLot = new Map(
    (stocks ?? []).map((s) => [
      s.lot_id,
      {
        qte_livree: s.qte_livree ?? 0,
        qte_perdue: s.qte_perdue ?? 0,
        qte_disponible: s.qte_disponible ?? 0,
      },
    ]),
  );

  // Regroupement par produit pour eviter le scroll infini quand le nombre
  // de lots historiques explose. Chaque produit est dans un <details> :
  // le Patron deplie ce qui l'interesse et garde les autres replies.
  const aujourdhui = new Date(new Date().toDateString());
  const groupes = new Map<string, GroupeProduit>();

  for (const l of lots ?? []) {
    const produit = Array.isArray(l.produits) ? l.produits[0] : l.produits;
    if (!produit || !l.produit_id) continue;
    const stock = stockParLot.get(l.id) ?? {
      qte_livree: 0,
      qte_perdue: 0,
      qte_disponible: l.qte_produite,
    };
    let g = groupes.get(l.produit_id);
    if (!g) {
      g = {
        produit_id: l.produit_id,
        nom: produit.nom,
        gamme: produit.gamme,
        format: produit.format,
        lots: [],
        totalProduit: 0,
        totalLivree: 0,
        totalPerdue: 0,
        totalDisponible: 0,
        prochaineDluo: null,
        aDluoDepassee: false,
      };
      groupes.set(l.produit_id, g);
    }
    g.lots.push({
      id: l.id,
      date_production: l.date_production,
      dluo: l.dluo,
      qte_produite: l.qte_produite,
      numero_lot: l.numero_lot,
      stock,
    });
    g.totalProduit += l.qte_produite;
    g.totalLivree += stock.qte_livree;
    g.totalPerdue += stock.qte_perdue;
    g.totalDisponible += stock.qte_disponible;
    // La prochaine DLUO = la plus proche parmi les lots avec stock dispo
    if (stock.qte_disponible > 0) {
      if (!g.prochaineDluo || l.dluo < g.prochaineDluo) {
        g.prochaineDluo = l.dluo;
      }
    }
    if (new Date(l.dluo) < aujourdhui && stock.qte_disponible > 0) {
      g.aDluoDepassee = true;
    }
  }

  // Tri : gamme puis nom du produit
  const groupesTries = Array.from(groupes.values()).sort((a, b) => {
    if (a.gamme !== b.gamme) return a.gamme.localeCompare(b.gamme);
    return a.nom.localeCompare(b.nom);
  });

  return (
    <div>
      <PageHeader
        title="Production"
        description="Saisie et historique des lots, regroupés par produit."
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

      {groupesTries.length === 0 ? (
        <div className="rounded-md border bg-background p-10 text-center text-muted-foreground">
          Aucun lot enregistré pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {groupesTries.map((g) => (
            <details
              key={g.produit_id}
              className="group rounded-md border bg-background open:bg-muted/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{g.nom}</span>
                      <span className="text-xs text-muted-foreground">
                        {GAMME_LABEL[g.gamme] ?? g.gamme} · {g.format}
                      </span>
                      {g.aDluoDepassee ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          DLUO
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4 text-sm tabular-nums">
                  <Stat label="Lots" value={g.lots.length} />
                  <Stat label="Produit" value={g.totalProduit} />
                  <Stat
                    label="Livré"
                    value={g.totalLivree}
                    className="text-blue-700 dark:text-blue-400"
                  />
                  <Stat
                    label="Perdu"
                    value={g.totalPerdue}
                    className={
                      g.totalPerdue > 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  />
                  <Stat
                    label="Dispo"
                    value={g.totalDisponible}
                    strong
                  />
                  <div className="hidden md:block min-w-[110px] text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Prochaine DLUO
                    </p>
                    <p className="text-xs font-medium">
                      {g.prochaineDluo ? formatDate(g.prochaineDluo) : "—"}
                    </p>
                  </div>
                </div>
              </summary>

              <div className="border-t bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date production</TableHead>
                      <TableHead>N° lot</TableHead>
                      <TableHead className="text-right">Produite</TableHead>
                      <TableHead className="text-right">Livrée</TableHead>
                      <TableHead className="text-right">Perdue</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead>DLUO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.lots.map((l) => {
                      const dluoPassee = new Date(l.dluo) < aujourdhui;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="text-muted-foreground">
                            <Link
                              href={`/stock/lots/${l.id}`}
                              className="hover:underline"
                            >
                              {formatDate(l.date_production)}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {l.numero_lot ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {l.qte_produite}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {l.stock.qte_livree > 0
                              ? `−${l.stock.qte_livree}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {l.stock.qte_perdue > 0
                              ? `−${l.stock.qte_perdue}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {l.stock.qte_disponible}
                          </TableCell>
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
                    })}
                  </TableBody>
                </Table>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: number;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className="text-right min-w-[55px]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`${strong ? "text-base font-semibold" : "text-sm"} ${className ?? ""}`.trim()}
      >
        {value}
      </p>
    </div>
  );
}
