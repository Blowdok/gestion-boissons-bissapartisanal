import { ArrowDownRight, ArrowUpRight, TrendingUp, Users, Package, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatEUR } from "@/lib/utils/format";
import { calculerRepartition } from "@/lib/domain/repartition";
import { CaChart } from "./ca-chart";

export const metadata = { title: "Tableau de bord · Gestion Boissons" };

const MOIS_LABELS = [
  "Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

function moisLabel(yyyymm: string) {
  const [, m] = yyyymm.split("-");
  return MOIS_LABELS[parseInt(m, 10) - 1] ?? m;
}

function moisPrecedent(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function douzeDerniersMois(): string[] {
  const today = new Date();
  const mois: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    mois.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return mois;
}

export default async function DashboardPage() {
  const { supabase } = await requireRole("patron");

  const moisCourant = new Date().toISOString().slice(0, 7);
  const moisM1 = moisPrecedent(moisCourant);
  const douzeMois = douzeDerniersMois();

  const [
    { data: caMensuel },
    { data: depensesMensuelles },
    { data: topClients },
    { data: topProduits },
  ] = await Promise.all([
    supabase.from("ca_mensuel").select("mois, ca_encaisse, ca_a_encaisser, ca_total"),
    supabase.from("depenses_mensuelles").select("mois, depenses_total"),
    supabase
      .from("top_clients_mensuel")
      .select("mois, raison_sociale, ca, nb_livraisons")
      .eq("mois", moisCourant)
      .order("ca", { ascending: false })
      .limit(5),
    supabase
      .from("top_produits_mensuel")
      .select("mois, produit_nom, gamme, qte_vendue, ca_ht")
      .eq("mois", moisCourant)
      .order("ca_ht", { ascending: false })
      .limit(5),
  ]);

  // Index par mois pour acces rapide
  const caParMois = new Map(
    (caMensuel ?? []).map((r) => [r.mois, Number(r.ca_encaisse)]),
  );
  const depParMois = new Map(
    (depensesMensuelles ?? []).map((r) => [r.mois, Number(r.depenses_total)]),
  );

  const caMois = caParMois.get(moisCourant) ?? 0;
  const caMoisM1 = caParMois.get(moisM1) ?? 0;
  const depMois = depParMois.get(moisCourant) ?? 0;
  const depMoisM1 = depParMois.get(moisM1) ?? 0;

  const repartitionMois = calculerRepartition(caMois, depMois);

  const variationCA =
    caMoisM1 > 0 ? ((caMois - caMoisM1) / caMoisM1) * 100 : null;
  const variationDep =
    depMoisM1 > 0 ? ((depMois - depMoisM1) / depMoisM1) * 100 : null;

  const chartData = douzeMois.map((m) => ({
    mois: m,
    mois_label: moisLabel(m),
    ca: caParMois.get(m) ?? 0,
    depenses: depParMois.get(m) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description={`Vue d'ensemble du mois en cours (${moisCourant}).`}
      />

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="CA encaissé"
          value={formatEUR(caMois)}
          variation={variationCA}
          icon={<Receipt className="size-4" />}
        />
        <KpiCard
          label="Dépenses"
          value={formatEUR(depMois)}
          variation={variationDep}
          inverse
          icon={<TrendingUp className="size-4" />}
        />
        <KpiCard
          label="Résultat (CA − Dép.)"
          value={formatEUR(repartitionMois.resultat)}
          icon={<TrendingUp className="size-4" />}
        />
        <KpiCard
          label="Mois précédent"
          value={formatEUR(caMoisM1)}
          sub={`CA ${moisM1}`}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      {/* Graphique 12 mois */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Évolution CA / Dépenses (12 derniers mois)</CardTitle>
          <CardDescription>
            Encaissements (vert) vs dépenses (rouge) par mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaChart data={chartData} />
        </CardContent>
      </Card>

      {/* Repartition 50/30/20 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Répartition automatique 50 / 30 / 20</CardTitle>
          <CardDescription>
            Calcul mensuel sur le résultat (CA encaissé − dépenses)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repartitionMois.resultat <= 0 ? (
            <p className="text-sm text-muted-foreground">
              Résultat négatif ou nul ce mois — aucune répartition possible.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <RepartitionCard
                label="Réinvestissement"
                pct="50%"
                montant={repartitionMois.reinvestissement}
                color="emerald"
              />
              <RepartitionCard
                label="Charges"
                pct="30%"
                montant={repartitionMois.charges}
                color="amber"
              />
              <RepartitionCard
                label="Personnel"
                pct="20%"
                montant={repartitionMois.personnel}
                color="blue"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 5 clients + Top 5 produits */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Top 5 clients ({moisCourant})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Livraisons</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients && topClients.length > 0 ? (
                  topClients.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.raison_sociale}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c.nb_livraisons}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEUR(Number(c.ca))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Aucun encaissement ce mois.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              Top 5 produits ({moisCourant})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Vendus</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProduits && topProduits.length > 0 ? (
                  topProduits.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span className="font-medium">{p.produit_nom}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {p.gamme}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.qte_vendue}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEUR(Number(p.ca_ht))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Aucune vente facturée ce mois.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  variation,
  inverse,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  variation?: number | null;
  inverse?: boolean; // pour les depenses, +X% est mauvais
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {variation !== null && variation !== undefined ? (
          <p
            className={
              "mt-1 flex items-center gap-1 text-xs " +
              (inverse
                ? variation > 0
                  ? "text-destructive"
                  : "text-emerald-700"
                : variation > 0
                  ? "text-emerald-700"
                  : "text-destructive")
            }
          >
            {variation > 0 ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(variation).toFixed(0)}% vs M-1
          </p>
        ) : sub ? (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RepartitionCard({
  label,
  pct,
  montant,
  color,
}: {
  label: string;
  pct: string;
  montant: number;
  color: "emerald" | "amber" | "blue";
}) {
  const tones: Record<typeof color, string> = {
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100",
    amber: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100",
    blue: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-100",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{formatEUR(montant)}</p>
      <p className="mt-1 text-xs opacity-75">{pct} du résultat</p>
    </div>
  );
}
