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
import { cn } from "@/lib/utils";
import { formatDate, formatEUR } from "@/lib/utils/format";
import { ListeDepenses } from "./depenses/liste-depenses";
import type { CategorieDepense } from "./depenses/schemas";
import {
  SOURCES_FONDS,
  SOURCE_LABELS,
  STATUTS_PAIEMENT_DEPENSE,
  STATUT_DEPENSE_LABELS,
  type SourceFonds,
  type StatutPaiementDepense,
} from "@/lib/domain/source-fonds";

export const metadata = { title: "Finance" };

type FinancePageProps = {
  searchParams: Promise<{ statut?: string; enveloppe?: string }>;
};

// Type-guards pour valider les valeurs reçues dans l'URL
function isStatut(v: unknown): v is StatutPaiementDepense {
  return typeof v === "string" && STATUTS_PAIEMENT_DEPENSE.includes(v as StatutPaiementDepense);
}
function isEnveloppe(v: unknown): v is SourceFonds {
  return typeof v === "string" && SOURCES_FONDS.includes(v as SourceFonds);
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const { supabase } = await requireRole("patron");
  const { statut, enveloppe } = await searchParams;

  const statutFiltre = isStatut(statut) ? statut : null;
  const enveloppeFiltre = isEnveloppe(enveloppe) ? enveloppe : null;

  const moisCourant = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Date butoir des échéances à venir (J+30) — calculée hors du JSX
  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);
  const limiteEcheances = dansTrenteJours.toISOString().slice(0, 10);

  // Construction de la requête dépenses avec filtres optionnels
  let depensesQuery = supabase
    .from("depenses_avec_solde")
    .select(
      "id, date, montant_total, reste_a_payer, categorie, source_fonds, description, justificatif_path, statut_paiement",
    )
    .order("date", { ascending: false })
    .limit(100);
  if (statutFiltre) depensesQuery = depensesQuery.eq("statut_paiement", statutFiltre);
  if (enveloppeFiltre) depensesQuery = depensesQuery.eq("source_fonds", enveloppeFiltre);

  const [
    { data: depenses },
    { data: decaissementMois },
    { data: engagementMois },
    { data: echeances },
  ] = await Promise.all([
    depensesQuery,
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

  // Helper : construit l'URL en surchargeant un seul paramètre (les autres
  // filtres actifs sont préservés)
  const hrefWith = (overrides: { statut?: string; enveloppe?: string }) => {
    const params = new URLSearchParams();
    const finalStatut = "statut" in overrides ? overrides.statut : statutFiltre ?? "";
    const finalEnv = "enveloppe" in overrides ? overrides.enveloppe : enveloppeFiltre ?? "";
    if (finalStatut) params.set("statut", finalStatut);
    if (finalEnv) params.set("enveloppe", finalEnv);
    const qs = params.toString();
    return qs ? `/finance?${qs}` : "/finance";
  };

  const aDesFiltres = Boolean(statutFiltre || enveloppeFiltre);

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
              {aDesFiltres
                ? "Calcul restreint aux dépenses filtrées ci-dessous"
                : "Somme des soldes ouverts sur la liste"}
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Dernières dépenses
          {aDesFiltres ? (
            <span className="ml-2 text-xs font-normal normal-case text-foreground">
              · {(depenses ?? []).length} résultat
              {(depenses ?? []).length > 1 ? "s" : ""}
            </span>
          ) : null}
        </h2>
        {aDesFiltres ? (
          <Link
            href="/finance"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Réinitialiser les filtres
          </Link>
        ) : null}
      </div>

      {/* Filtres : statut puis enveloppe */}
      <div className="mb-4 space-y-2">
        <FilterRow label="Statut">
          <FilterButton
            href={hrefWith({ statut: "" })}
            active={!statutFiltre}
            label="Tous"
          />
          {STATUTS_PAIEMENT_DEPENSE.map((s) => (
            <FilterButton
              key={s}
              href={hrefWith({ statut: s })}
              active={statutFiltre === s}
              label={STATUT_DEPENSE_LABELS[s]}
            />
          ))}
        </FilterRow>
        <FilterRow label="Enveloppe">
          <FilterButton
            href={hrefWith({ enveloppe: "" })}
            active={!enveloppeFiltre}
            label="Toutes"
          />
          {SOURCES_FONDS.map((s) => (
            <FilterButton
              key={s}
              href={hrefWith({ enveloppe: s })}
              active={enveloppeFiltre === s}
              label={SOURCE_LABELS[s]}
            />
          ))}
        </FilterRow>
      </div>

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

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterButton({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
