import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatEUR } from "@/lib/utils/format";

export const metadata = { title: "Factures · Gestion Boissons" };

type SearchParams = Promise<{ filtre?: string }>;

const FILTRES = {
  toutes: "Toutes",
  impayees: "Impayées",
  partielles: "Partielles",
  payees: "Payées",
  ">30": "Impayées > 30j",
  ">60": "Impayées > 60j",
  ">90": "Impayées > 90j",
} as const;

type FiltreKey = keyof typeof FILTRES;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("patron", "livreur");
  const { filtre = "toutes" } = await searchParams;
  const filtreKey = (filtre as FiltreKey) in FILTRES ? (filtre as FiltreKey) : "toutes";

  const { supabase } = await requireRole("patron", "livreur");

  let request = supabase
    .from("factures_avec_solde")
    .select(
      "id, numero, date_emission, montant_ht, montant_paye, solde, statut_paiement, anciennete_jours, client_id, livraison_id",
    )
    .order("date_emission", { ascending: false })
    .limit(200);

  switch (filtreKey) {
    case "impayees":
      request = request.eq("statut_paiement", "impaye");
      break;
    case "partielles":
      request = request.eq("statut_paiement", "partiel");
      break;
    case "payees":
      request = request.eq("statut_paiement", "paye");
      break;
    case ">30":
      request = request.in("statut_paiement", ["impaye", "partiel"]).gte("anciennete_jours", 30);
      break;
    case ">60":
      request = request.in("statut_paiement", ["impaye", "partiel"]).gte("anciennete_jours", 60);
      break;
    case ">90":
      request = request.in("statut_paiement", ["impaye", "partiel"]).gte("anciennete_jours", 90);
      break;
  }

  const { data: factures } = await request;

  const clientIds = [...new Set((factures ?? []).map((f) => f.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, raison_sociale")
        .in("id", clientIds)
    : { data: [] };
  const clientMap = new Map(clients?.map((c) => [c.id, c.raison_sociale]) ?? []);

  const totalImpaye = (factures ?? [])
    .filter((f) => f.statut_paiement !== "paye")
    .reduce((acc, f) => acc + Number(f.solde), 0);

  return (
    <div>
      <PageHeader
        title="Factures"
        description="Liste et suivi des paiements. Les factures sont générées automatiquement à la livraison."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(FILTRES).map(([k, label]) => (
          <Link
            key={k}
            href={`/factures?filtre=${k}`}
            className={
              buttonVariants({
                variant: filtreKey === k ? "default" : "outline",
                size: "sm",
              })
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {totalImpaye > 0 ? (
        <div className="mb-4 rounded-md border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <p className="text-sm">
            <strong>Encours {formatEUR(totalImpaye)}</strong> sur les factures
            filtrées.
          </p>
        </div>
      ) : null}

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Montant HT</TableHead>
              <TableHead className="text-right">Encaissé</TableHead>
              <TableHead className="text-right">Solde</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Ancienneté</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {factures && factures.length > 0 ? (
              factures.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/factures/${f.id}`} className="hover:underline">
                      {f.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(f.date_emission)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {clientMap.get(f.client_id) ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatEUR(Number(f.montant_ht))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatEUR(Number(f.montant_paye))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatEUR(Number(f.solde))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        f.statut_paiement === "paye"
                          ? "default"
                          : f.statut_paiement === "partiel"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {f.statut_paiement === "paye"
                        ? "Payée"
                        : f.statut_paiement === "partiel"
                          ? "Partielle"
                          : "Impayée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {f.anciennete_jours} j
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Aucune facture pour ce filtre.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
