import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
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
import {
  STATUT_LABEL,
  STATUT_BADGE_CLASS,
  STATUT_PAIEMENT_LABEL,
  STATUT_PAIEMENT_BADGE_CLASS,
  type StatutLivraison,
  type StatutPaiement,
} from "../schemas";
import { LivraisonStatusActions } from "./status-actions";

export const metadata = { title: "Livraison · Gestion Boissons" };

const GAMME_LABEL: Record<string, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

export default async function LivraisonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, supabase, user } = await requireRole(
    "patron",
    "fabrication",
    "livreur",
  );

  const { data: livraison } = await supabase
    .from("livraisons")
    .select(
      `
      id, date_prevue, date_livraison, statut, notes, livreur_id, created_at,
      clients(id, raison_sociale, contact, ville, telephone, conditions_paiement),
      lignes_livraison(id, qte, prix_unitaire_ht, lots_utilises, produits(id, nom, gamme, format))
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!livraison) notFound();

  const client = Array.isArray(livraison.clients) ? livraison.clients[0] : livraison.clients;
  const lignes = livraison.lignes_livraison ?? [];
  const total = lignes.reduce(
    (acc, l) => acc + Number(l.qte) * Number(l.prix_unitaire_ht),
    0,
  );

  // Recupere la facture eventuelle
  const { data: facture } = await supabase
    .from("factures_avec_solde")
    .select("id, numero, montant_ht, montant_encaisse, montant_a_encaisser, solde, statut_paiement")
    .eq("livraison_id", id)
    .maybeSingle();

  const statut = livraison.statut as StatutLivraison;
  const isLivreurAssigne = livraison.livreur_id === user.id;
  const canChangeStatus =
    profile.role === "patron" ||
    profile.role === "adjoint" ||
    profile.role === "fabrication" ||
    (profile.role === "livreur" && isLivreurAssigne);
  const canEditMetadata =
    (profile.role === "patron" ||
      profile.role === "adjoint" ||
      profile.role === "fabrication") &&
    statut !== "livree" &&
    statut !== "annulee";

  return (
    <div>
      <Link
        href="/livraisons"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux livraisons
      </Link>

      <PageHeader
        title={`Livraison · ${client?.raison_sociale ?? "—"}`}
        description={
          <>
            Prévue le {formatDate(livraison.date_prevue)}
            {livraison.date_livraison ? (
              <> · effectuée le {formatDateTime(livraison.date_livraison)}</>
            ) : null}
          </>
        }
        actions={
          <>
            <Badge className={`mr-2 ${STATUT_BADGE_CLASS[statut]}`}>
              {STATUT_LABEL[statut]}
            </Badge>
            {canEditMetadata ? (
              <Link
                href={`/livraisons/${livraison.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="size-4" />
                Modifier
              </Link>
            ) : null}
            {canChangeStatus ? (
              <LivraisonStatusActions
                id={livraison.id}
                statut={statut}
                role={profile.role}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lignes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Lots utilisés (FIFO)</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Prix unit. HT</TableHead>
                  <TableHead className="text-right">Sous-total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l) => {
                  const produit = Array.isArray(l.produits) ? l.produits[0] : l.produits;
                  const lots = (l.lots_utilises as Array<{ lot_id: string; dluo: string; qte: number }> | null) ?? [];
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {produit?.nom}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {GAMME_LABEL[produit?.gamme ?? ""] ?? produit?.gamme} {produit?.format}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lots.length > 0 ? (
                          <ul className="space-y-0.5">
                            {lots.map((a, i) => (
                              <li key={i} className="font-mono">
                                <Link
                                  href={`/stock/lots/${a.lot_id}`}
                                  className="hover:underline"
                                >
                                  {a.lot_id.slice(0, 8)}
                                </Link>
                                {" · "}DLUO {formatDate(a.dluo)} · {a.qte} u.
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
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
                  <TableCell colSpan={4} className="text-right font-semibold">
                    Total HT
                  </TableCell>
                  <TableCell className="text-right text-lg font-semibold">
                    {formatEUR(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{client?.raison_sociale}</p>
              {client?.contact ? (
                <p className="text-sm text-muted-foreground">{client.contact}</p>
              ) : null}
              {client?.telephone ? (
                <p className="text-sm text-muted-foreground">{client.telephone}</p>
              ) : null}
              {client?.ville ? (
                <p className="mt-1 text-sm text-muted-foreground">{client.ville}</p>
              ) : null}
              {client?.conditions_paiement ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Conditions : {client.conditions_paiement}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {facture ? (
            <Card>
              <CardHeader>
                <CardTitle>Facture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-mono text-sm">{facture.numero}</p>
                <div className="text-sm">
                  <p>
                    Total : <strong>{formatEUR(Number(facture.montant_ht))}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Encaissé : {formatEUR(Number(facture.montant_encaisse))}
                  </p>
                  {Number(facture.montant_a_encaisser) > 0 ? (
                    <p className="text-muted-foreground">
                      À encaisser : {formatEUR(Number(facture.montant_a_encaisser))}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground">
                    Solde : {formatEUR(Number(facture.solde))}
                  </p>
                </div>
                <Badge
                  className={
                    STATUT_PAIEMENT_BADGE_CLASS[facture.statut_paiement as StatutPaiement]
                  }
                >
                  {STATUT_PAIEMENT_LABEL[facture.statut_paiement as StatutPaiement]}
                </Badge>
                <Link
                  href={`/factures/${facture.id}`}
                  className={
                    buttonVariants({ variant: "outline", size: "sm" }) +
                    " w-full mt-2"
                  }
                >
                  <ExternalLink className="size-4" />
                  Voir la facture
                </Link>
              </CardContent>
            </Card>
          ) : null}

          {livraison.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {livraison.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
