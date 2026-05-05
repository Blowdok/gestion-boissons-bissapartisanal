import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatDateTime, formatEUR } from "@/lib/utils/format";
import { MODE_LABEL, type ModePaiement } from "../../livraisons/schemas";
import { PaiementForm } from "./paiement-form";

export const metadata = { title: "Facture · Gestion Boissons" };

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("patron", "livreur");

  const { data: facture } = await supabase
    .from("factures_avec_solde")
    .select(
      "id, numero, date_emission, montant_ht, montant_paye, solde, statut_paiement, anciennete_jours, livraison_id, client_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!facture) notFound();

  const [{ data: client }, { data: livraison }, { data: paiements }] = await Promise.all([
    supabase
      .from("clients")
      .select("raison_sociale, contact, adresse, ville, code_postal, siret, conditions_paiement")
      .eq("id", facture.client_id)
      .maybeSingle(),
    supabase
      .from("livraisons")
      .select(
        "id, date_livraison, lignes_livraison(qte, prix_unitaire_ht, produits(nom, format))",
      )
      .eq("id", facture.livraison_id)
      .maybeSingle(),
    supabase
      .from("paiements")
      .select("id, montant, mode, date_encaissement, notes, created_at")
      .eq("facture_id", id)
      .order("date_encaissement", { ascending: false }),
  ]);

  const lignes = livraison?.lignes_livraison ?? [];

  return (
    <div>
      <Link
        href="/factures"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux factures
      </Link>

      <PageHeader
        title={facture.numero}
        description={
          <>
            Émise le {formatDate(facture.date_emission)} ·{" "}
            <Badge
              variant={
                facture.statut_paiement === "paye"
                  ? "default"
                  : facture.statut_paiement === "partiel"
                    ? "secondary"
                    : "destructive"
              }
              className="ml-1"
            >
              {facture.statut_paiement === "paye"
                ? "Payée"
                : facture.statut_paiement === "partiel"
                  ? "Partielle"
                  : "Impayée"}
            </Badge>
          </>
        }
        actions={
          <Link
            href={`/livraisons/${facture.livraison_id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <ExternalLink className="size-4" />
            Livraison liée
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lignes facturées</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Prix unit. HT</TableHead>
                  <TableHead className="text-right">Sous-total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l, i) => {
                  const p = Array.isArray(l.produits) ? l.produits[0] : l.produits;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {p?.nom}
                        {p?.format ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.format}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">{l.qte}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatEUR(Number(l.prix_unitaire_ht))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEUR(Number(l.qte) * Number(l.prix_unitaire_ht))}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total HT
                  </TableCell>
                  <TableCell className="text-right text-lg font-semibold">
                    {formatEUR(Number(facture.montant_ht))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-medium">{formatEUR(Number(facture.montant_ht))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Encaissé</span>
                <span className="font-medium">
                  {formatEUR(Number(facture.montant_paye))}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-base">
                <span>Solde restant</span>
                <span className="font-semibold">
                  {formatEUR(Number(facture.solde))}
                </span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Ancienneté : {facture.anciennete_jours} jour(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{client?.raison_sociale}</p>
              {client?.contact ? (
                <p className="text-sm text-muted-foreground">{client.contact}</p>
              ) : null}
              {(client?.adresse || client?.ville) ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {client?.adresse}
                  {client?.adresse && client?.ville ? ", " : ""}
                  {client?.code_postal} {client?.ville}
                </p>
              ) : null}
              {client?.siret ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  SIRET {client.siret}
                </p>
              ) : null}
              {client?.conditions_paiement ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Conditions : {client.conditions_paiement}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {Number(facture.solde) > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Encaisser un paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <PaiementForm
              factureId={facture.id}
              soldeRestant={Number(facture.solde)}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Saisi le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements && paiements.length > 0 ? (
                paiements.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date_encaissement)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {MODE_LABEL[p.mode as ModePaiement]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatEUR(Number(p.montant))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateTime(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun paiement enregistré.
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
