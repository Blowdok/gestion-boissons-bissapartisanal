import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatEUR } from "@/lib/utils/format";
import {
  CATEGORIE_LABELS,
  type CategorieDepense,
} from "../schemas";
import {
  SOURCE_LABELS,
  STATUT_DEPENSE_LABELS,
  type ModePaiementDepense,
  type SourceFonds,
  type StatutPaiementDepense,
} from "@/lib/domain/source-fonds";
import { PaiementsSection } from "./paiements-section";

export const metadata = { title: "Dépense" };

type Props = { params: Promise<{ id: string }> };

const STATUT_BADGE: Record<
  StatutPaiementDepense,
  "default" | "secondary" | "destructive" | "outline"
> = {
  paye: "default",
  partiel: "secondary",
  prevu: "outline",
  a_payer: "destructive",
};

export default async function DepenseDetailPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireRole("patron");

  const [{ data: depense }, { data: paiements }] = await Promise.all([
    supabase
      .from("depenses_avec_solde")
      .select(
        "id, date, montant_total, categorie, source_fonds, description, justificatif_path, deja_paye, prevu, reste_a_payer, prochaine_echeance, statut_paiement",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("paiements_depense")
      .select("id, montant, date_prevue, date_effectif, mode, note, created_at")
      .eq("depense_id", id)
      .order("date_effectif", { ascending: false, nullsFirst: false })
      .order("date_prevue", { ascending: true, nullsFirst: false }),
  ]);

  if (!depense) notFound();

  const statut = depense.statut_paiement as StatutPaiementDepense;

  return (
    <div>
      <PageHeader
        title={`Dépense du ${formatDate(depense.date)}`}
        description={depense.description ?? "Sans description"}
        actions={
          <Link
            href="/finance"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        }
      />

      {/* Bandeau récap */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Montant total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatEUR(Number(depense.montant_total))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Déjà payé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {formatEUR(Number(depense.deja_paye))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reste à payer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold ${
                Number(depense.reste_a_payer) > 0
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {formatEUR(Number(depense.reste_a_payer))}
            </p>
            {depense.prochaine_echeance ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Prochaine échéance : {formatDate(depense.prochaine_echeance)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={STATUT_BADGE[statut]}>
              {STATUT_DEPENSE_LABELS[statut]}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Détails */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Détails de la dépense</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Date d&apos;engagement
              </dt>
              <dd className="mt-0.5">{formatDate(depense.date)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Catégorie
              </dt>
              <dd className="mt-0.5">
                <Badge variant="secondary">
                  {CATEGORIE_LABELS[depense.categorie as CategorieDepense]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Enveloppe
              </dt>
              <dd className="mt-0.5">
                <Badge variant="outline">
                  {SOURCE_LABELS[depense.source_fonds as SourceFonds]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Justificatif
              </dt>
              <dd className="mt-0.5">
                {depense.justificatif_path ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <FileText className="size-3.5" />
                    Disponible
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            {depense.description ? (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Description
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap">
                  {depense.description}
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Paiements & échéances */}
      <PaiementsSection
        depenseId={depense.id}
        montantTotal={Number(depense.montant_total)}
        resteAPayer={Number(depense.reste_a_payer)}
        paiements={(paiements ?? []).map((p) => ({
          id: p.id,
          montant: Number(p.montant),
          date_prevue: p.date_prevue,
          date_effectif: p.date_effectif,
          mode: p.mode as ModePaiementDepense,
          note: p.note,
        }))}
      />
    </div>
  );
}
