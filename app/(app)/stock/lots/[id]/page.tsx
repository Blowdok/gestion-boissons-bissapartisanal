import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { joursAvantDluo } from "@/lib/domain/stock";

export const metadata = { title: "Lot · Stock" };

const TYPE_LABEL: Record<string, string> = {
  production: "Production",
  livraison: "Livraison",
  perte: "Perte",
  ajustement: "Ajustement",
};

const TYPE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  production: "secondary",
  livraison: "default",
  perte: "destructive",
  ajustement: "outline",
};

const MOTIF_LABEL: Record<string, string> = {
  casse: "Casse",
  peremption: "Péremption",
  retour_client: "Retour client",
  autre: "Autre",
};

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, supabase } = await requireRole("patron", "fabrication", "livreur");
  const canSaisirPerte = profile.role === "patron" || profile.role === "fabrication";

  const { data: lot } = await supabase
    .from("lots")
    .select(
      "id, date_production, dluo, qte_produite, numero_lot, notes, created_at, produits(id, nom, gamme, format)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!lot) notFound();

  const produit = Array.isArray(lot.produits) ? lot.produits[0] : lot.produits;

  const [{ data: stock }, { data: mouvements }] = await Promise.all([
    supabase
      .from("stock_par_lot")
      .select("qte_livree, qte_perdue, qte_disponible, dluo_passee")
      .eq("lot_id", id)
      .maybeSingle(),
    supabase
      .from("mouvements_stock")
      .select("id, type, qte, motif, notes, created_at")
      .eq("lot_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <Link
        href="/stock"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour au stock
      </Link>

      <PageHeader
        title={`Lot ${produit?.nom ?? "—"}`}
        description={
          <>
            Produit le {formatDate(lot.date_production)}
            {lot.numero_lot ? ` · n° ${lot.numero_lot}` : null}
          </>
        }
        actions={
          canSaisirPerte ? (
            <Link
              href={`/stock/pertes/nouveau?lot=${lot.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <AlertTriangle className="size-4" />
              Saisir une perte
            </Link>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quantités</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Row label="Produite" value={lot.qte_produite} />
              <Row label="Livrée" value={stock?.qte_livree ?? 0} muted />
              <Row label="Perdue" value={stock?.qte_perdue ?? 0} muted />
              <hr className="my-2 border-border" />
              <Row
                label="Disponible"
                value={stock?.qte_disponible ?? 0}
                strong
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DLUO</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {formatDate(lot.dluo)}
            </p>
            <DluoStatus dluo={lot.dluo} dluoPassee={stock?.dluo_passee ?? false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métadonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Row label="Format" value={produit?.format ?? "—"} muted />
              <Row label="Numéro" value={lot.numero_lot ?? "—"} muted />
              <Row label="Saisi le" value={formatDateTime(lot.created_at)} muted />
            </dl>
          </CardContent>
        </Card>
      </div>

      {lot.notes ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {lot.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Motif / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mouvements && mouvements.length > 0 ? (
                mouvements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANT[m.type]}>
                        {TYPE_LABEL[m.type] ?? m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {m.type === "production" ? "+" : "−"}
                      {m.qte}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.motif ? (
                        <span className="font-medium">
                          {MOTIF_LABEL[m.motif] ?? m.motif}
                        </span>
                      ) : null}
                      {m.motif && m.notes ? " · " : null}
                      {m.notes ?? null}
                      {!m.motif && !m.notes ? "—" : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aucun mouvement.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DluoStatus({ dluo, dluoPassee }: { dluo: string; dluoPassee: boolean }) {
  if (dluoPassee) {
    return (
      <Badge variant="destructive" className="mt-2">
        Dépassée
      </Badge>
    );
  }
  const jours = joursAvantDluo(dluo);
  return (
    <p className="mt-2 text-xs text-muted-foreground">{jours} jours restants</p>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={strong ? "text-lg font-semibold" : "font-medium"}>
        {value}
      </dd>
    </div>
  );
}
