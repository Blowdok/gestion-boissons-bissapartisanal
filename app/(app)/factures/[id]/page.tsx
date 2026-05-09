import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
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
  MODE_LABEL,
  STATUT_PAIEMENT_LABEL,
  STATUT_PAIEMENT_BADGE_CLASS,
  type ModePaiement,
  type StatutPaiement,
} from "../../livraisons/schemas";
import { PaiementForm } from "./paiement-form";
import { DeletePaiementButton } from "./delete-paiement";
import { EnvoiEmailButton } from "./envoi-email-button";
import { RelanceModal } from "./relance-modal";
import { FactureAnnuler } from "./facture-annuler";
import { isAiActive } from "@/lib/ai/client";
import {
  NIVEAU_LABELS,
  type NiveauRelance,
} from "@/lib/domain/niveau-relance";

export const metadata = { title: "Facture" };

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, user, supabase } = await requireRole("patron", "livreur");

  const { data: facture } = await supabase
    .from("factures_avec_solde")
    .select(
      "id, numero, date_emission, montant_ht, montant_encaisse, montant_a_encaisser, solde, statut_paiement, anciennete_jours, livraison_id, client_id, est_annulee, annulee_le, motif_annulation",
    )
    .eq("id", id)
    .maybeSingle();

  if (!facture) notFound();

  const estAnnulee = Boolean(facture.est_annulee);
  const peutAnnuler = profile.role === "patron" && !estAnnulee;

  const [
    { data: client },
    { data: livraison },
    { data: paiements },
    { data: relances },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("raison_sociale, contact, adresse, ville, code_postal, siret, email, telephone, conditions_paiement")
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
      .select("id, montant, mode, date_encaissement, notes, created_at, encaisse_par")
      .eq("facture_id", id)
      .order("date_encaissement", { ascending: false }),
    supabase
      .from("relances_facture")
      .select("id, niveau, sujet, envoye_a, envoye_le")
      .eq("facture_id", id)
      .order("envoye_le", { ascending: false }),
  ]);

  const lignes = livraison?.lignes_livraison ?? [];

  // Verifie si l'utilisateur courant peut supprimer un paiement donne :
  // - Patron : toujours
  // - Livreur : seulement les siens, < 24h
  // Date.now() est appelee une seule fois par requete (Server Component) :
  // la regle react-hooks/purity vise les Client Components qui re-render
  // souvent, ici c'est sur (1 render par requete HTTP).
  // eslint-disable-next-line react-hooks/purity
  const seuil24h = Date.now() - 24 * 60 * 60 * 1000;
  const peutSupprimer = (p: { encaisse_par: string | null; created_at: string }) => {
    if (profile.role === "patron") return true;
    if (profile.role !== "livreur") return false;
    if (p.encaisse_par !== user.id) return false;
    return new Date(p.created_at).getTime() > seuil24h;
  };

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
            {estAnnulee ? (
              <Badge className="ml-1 bg-destructive text-destructive-foreground hover:bg-destructive">
                ANNULÉE
              </Badge>
            ) : (
              <Badge
                className={`ml-1 ${STATUT_PAIEMENT_BADGE_CLASS[facture.statut_paiement as StatutPaiement]}`}
              >
                {STATUT_PAIEMENT_LABEL[facture.statut_paiement as StatutPaiement]}
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <a
              href={`/api/pdf/facture/${facture.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "default" })}
            >
              <Download className="size-4" />
              Télécharger PDF
            </a>
            {!estAnnulee ? (
              <EnvoiEmailButton
                factureId={facture.id}
                clientEmail={client?.email ?? null}
              />
            ) : null}
            {/* Bouton relance : Patron + Adjoint, IA activée, facture impayée
                et non annulée, client a un email. Sinon non rendu. */}
            {!estAnnulee &&
            (profile.role === "patron" || profile.role === "adjoint") &&
            isAiActive() &&
            Number(facture.solde) > 0.01 ? (
              <RelanceModal
                factureId={facture.id}
                numeroFacture={facture.numero}
                ancienneteJours={Number(facture.anciennete_jours ?? 0)}
                hasEmail={Boolean(client?.email)}
              />
            ) : null}
            <Link
              href={`/livraisons/${facture.livraison_id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ExternalLink className="size-4" />
              Livraison liée
            </Link>
            {peutAnnuler ? (
              <FactureAnnuler
                factureId={facture.id}
                numero={facture.numero}
                aPaiements={
                  Number(facture.montant_encaisse) > 0 ||
                  Number(facture.montant_a_encaisser) > 0
                }
              />
            ) : null}
          </>
        }
      />

      {estAnnulee ? (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Facture annulée
            {facture.annulee_le ? (
              <> le {formatDateTime(facture.annulee_le)}</>
            ) : null}
            .
          </p>
          {facture.motif_annulation ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Motif : {facture.motif_annulation}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            La facture reste consultable pour la traçabilité légale mais ne
            compte plus dans le CA ni les statistiques. Les paiements
            associés ont été supprimés.
          </p>
        </div>
      ) : null}

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
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {formatEUR(Number(facture.montant_encaisse))}
                </span>
              </div>
              {Number(facture.montant_a_encaisser) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">À encaisser</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {formatEUR(Number(facture.montant_a_encaisser))}
                  </span>
                </div>
              ) : null}
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

      {Number(facture.solde) > 0 && !estAnnulee ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Enregistrer un paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <PaiementForm
              factureId={facture.id}
              resteAEncaisser={Number(facture.solde)}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Historique des relances envoyées (V2-AI uniquement, masqué si vide) */}
      {(relances ?? []).length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Relances envoyées</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date d&apos;envoi</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Destinataire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(relances ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.envoye_le)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {NIVEAU_LABELS[r.niveau as NiveauRelance]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.sujet}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.envoye_a}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                <TableHead>Statut</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Saisi le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements && paiements.length > 0 ? (
                paiements.map((p) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const estFutur = p.date_encaissement > todayStr;
                  return (
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
                      <TableCell>
                        {estFutur ? (
                          <Badge className="bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-700">
                            À encaisser
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-700 text-white hover:bg-emerald-700 dark:bg-emerald-800">
                            Encaissé
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDateTime(p.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {peutSupprimer(p) ? (
                          <DeletePaiementButton
                            id={p.id}
                            montant={formatEUR(Number(p.montant))}
                            mode={MODE_LABEL[p.mode as ModePaiement]}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
