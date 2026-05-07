import Link from "next/link";
import { AlertTriangle, Download, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatEUR } from "@/lib/utils/format";
import { ListeDepenses } from "./depenses/liste-depenses";
import type { CategorieDepense } from "./depenses/schemas";
import {
  SOURCE_LABELS,
  type SourceFonds,
  type StatutPaiementDepense,
} from "@/lib/domain/source-fonds";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const { supabase } = await requireRole("patron");

  const moisCourant = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Date butoir des échéances à venir (J+30) — calculée hors du JSX
  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);
  const limiteEcheances = dansTrenteJours.toISOString().slice(0, 10);

  const [
    { data: depenses },
    { data: decaissementMois },
    { data: engagementMois },
    { data: echeances },
  ] = await Promise.all([
    supabase
      .from("depenses_avec_solde")
      .select(
        "id, date, montant_total, reste_a_payer, categorie, source_fonds, description, justificatif_path, statut_paiement",
      )
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("decaissements_mensuels")
      .select("decaisse, decaisse_programme")
      .eq("mois", moisCourant)
      .maybeSingle(),
    supabase
      .from("depenses_engagees_mensuelles")
      .select("engagement_total")
      .eq("mois", moisCourant)
      .maybeSingle(),
    // Échéances à venir dans les 30 prochains jours (max 5 lignes pour le récap)
    supabase
      .from("echeances_a_venir")
      .select(
        "id, depense_id, montant, date_prevue, source_fonds, depense_description, urgence",
      )
      .lte("date_prevue", limiteEcheances)
      .order("date_prevue", { ascending: true })
      .limit(5),
  ]);

  const totalDecaisse = Number(decaissementMois?.decaisse ?? 0);
  const totalEngage = Number(engagementMois?.engagement_total ?? 0);

  // Calcul du solde total à régler (somme reste_a_payer sur dépenses non soldées)
  const totalAPayer = (depenses ?? []).reduce(
    (acc, d) => acc + (Number(d.reste_a_payer) > 0 ? Number(d.reste_a_payer) : 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Saisie des dépenses, suivi du compte d'exploitation et exports comptables."
        actions={
          <>
            <Link
              href={`/api/export/comptable?mois=${moisCourant}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Download className="size-4" />
              Export CSV ({moisCourant})
            </Link>
            <Link
              href="/finance/depenses/nouvelle"
              className={buttonVariants({ size: "default" })}
            >
              <Plus className="size-4" />
              Nouvelle dépense
            </Link>
          </>
        }
      />

      {/* KPIs financiers */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Décaissements du mois ({moisCourant})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatEUR(totalDecaisse)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Engagements du mois : {formatEUR(totalEngage)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reste à payer (toutes dépenses)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-600">
              {formatEUR(totalAPayer)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Somme des soldes ouverts sur la liste
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Échéances dans les 30 j
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(echeances ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune échéance planifiée prochainement.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(echeances ?? []).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/finance/depenses/${e.depense_id}`}
                      className="flex items-center gap-2 truncate hover:underline"
                    >
                      {e.urgence === "en_retard" ? (
                        <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                      ) : null}
                      <span className="truncate">
                        {formatDate(e.date_prevue)} ·{" "}
                        {e.depense_description ?? "—"}
                      </span>
                    </Link>
                    <span className="shrink-0 text-right font-medium">
                      {formatEUR(Number(e.montant))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Dernières dépenses
      </h2>
      <ListeDepenses
        depenses={(depenses ?? []).map((d) => ({
          id: d.id,
          date: d.date,
          montant_total: Number(d.montant_total),
          reste_a_payer: Number(d.reste_a_payer),
          categorie: d.categorie as CategorieDepense,
          source_fonds: d.source_fonds as SourceFonds,
          description: d.description,
          justificatif_path: d.justificatif_path,
          statut_paiement: d.statut_paiement as StatutPaiementDepense,
        }))}
      />

      {/* Légende discrète sur les badges enveloppe (utile pour le patron) */}
      <p className="mt-4 text-xs text-muted-foreground">
        Enveloppes : {SOURCE_LABELS.reinvestissement} 50% ·{" "}
        {SOURCE_LABELS.charges} 30% · {SOURCE_LABELS.personnel} 20%
      </p>
    </div>
  );
}
