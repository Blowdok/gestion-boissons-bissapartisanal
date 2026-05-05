import Link from "next/link";
import { CheckCircle2, ChevronRight, MapPin, Phone, UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatEUR } from "@/lib/utils/format";
import {
  STATUT_LABEL,
  STATUT_VARIANT,
  type StatutLivraison,
} from "../schemas";
import { ClaimButton } from "./claim-button";

export const metadata = { title: "Ma tournée du jour" };

export default async function TourneePage() {
  const { profile, supabase, user } = await requireRole("patron", "livreur");

  const today = new Date().toISOString().slice(0, 10);

  // Patron : voit toutes les livraisons du jour (programmees + en cours)
  // Livreur : voit ses livraisons + les non-assignees (pour pouvoir les prendre)
  let request = supabase
    .from("livraisons")
    .select(
      `
      id, date_prevue, statut, notes, livreur_id,
      clients(raison_sociale, contact, adresse, ville, code_postal, telephone),
      lignes_livraison(qte, prix_unitaire_ht)
      `,
    )
    .eq("date_prevue", today)
    .in("statut", ["programmee", "en_cours"])
    .order("livreur_id", { ascending: false, nullsFirst: false })
    .order("created_at");

  if (profile.role === "livreur") {
    // Mes livraisons OU les non-assignees
    request = request.or(`livreur_id.eq.${user.id},livreur_id.is.null`);
  }

  const { data: livraisons } = await request;

  // Separe en deux groupes pour la livreur : a moi vs disponibles
  const aMoi = livraisons?.filter((l) => l.livreur_id === user.id) ?? [];
  const dispo = livraisons?.filter((l) => l.livreur_id === null) ?? [];
  const livreurAutres =
    profile.role === "patron"
      ? livraisons?.filter((l) => l.livreur_id && l.livreur_id !== user.id) ?? []
      : [];

  const total = (livraisons ?? []).length;

  return (
    <div>
      <PageHeader
        title={profile.role === "livreur" ? "Ma tournée du jour" : "Tournées du jour"}
        description={`${total} livraison(s) à effectuer le ${formatDate(today)}.`}
      />

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <p>Aucune livraison à effectuer aujourd&apos;hui.</p>
          </CardContent>
        </Card>
      ) : null}

      {profile.role === "livreur" && aMoi.length > 0 ? (
        <Section title="Mes livraisons" count={aMoi.length}>
          <Liste livraisons={aMoi} mode="assignee" />
        </Section>
      ) : null}

      {profile.role === "livreur" && dispo.length > 0 ? (
        <Section
          title="Disponibles à prendre"
          count={dispo.length}
          subtitle="Cliquez « Prendre » pour vous assigner une livraison."
        >
          <Liste livraisons={dispo} mode="disponible" />
        </Section>
      ) : null}

      {profile.role === "patron" && total > 0 ? (
        <>
          {dispo.length > 0 ? (
            <Section title="Non assignées" count={dispo.length}>
              <Liste livraisons={dispo} mode="assignee" />
            </Section>
          ) : null}
          {aMoi.length > 0 ? (
            <Section title="Mes livraisons" count={aMoi.length}>
              <Liste livraisons={aMoi} mode="assignee" />
            </Section>
          ) : null}
          {livreurAutres.length > 0 ? (
            <Section
              title="Assignées à d'autres livreurs"
              count={livreurAutres.length}
            >
              <Liste livraisons={livreurAutres} mode="assignee" />
            </Section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  subtitle,
  children,
}: {
  title: string;
  count: number;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {subtitle ? (
        <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type LivraisonCard = {
  id: string;
  statut: string;
  notes: string | null;
  livreur_id: string | null;
  clients:
    | {
        raison_sociale: string;
        contact: string | null;
        adresse: string | null;
        ville: string | null;
        code_postal: string | null;
        telephone: string | null;
      }
    | Array<{
        raison_sociale: string;
        contact: string | null;
        adresse: string | null;
        ville: string | null;
        code_postal: string | null;
        telephone: string | null;
      }>
    | null;
  lignes_livraison: { qte: number; prix_unitaire_ht: number }[] | null;
};

function Liste({
  livraisons,
  mode,
}: {
  livraisons: LivraisonCard[];
  mode: "assignee" | "disponible";
}) {
  return livraisons.map((l) => {
    const c = Array.isArray(l.clients) ? l.clients[0] : l.clients;
    const total = (l.lignes_livraison ?? []).reduce(
      (acc, lg) => acc + Number(lg.qte) * Number(lg.prix_unitaire_ht),
      0,
    );
    const nbUnites = (l.lignes_livraison ?? []).reduce(
      (acc, lg) => acc + Number(lg.qte),
      0,
    );

    return (
      <Card
        key={l.id}
        className="relative transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {mode === "assignee" ? (
                  <Link
                    href={`/livraisons/${l.id}`}
                    className="before:absolute before:inset-0 before:content-['']"
                  >
                    {c?.raison_sociale ?? "—"}
                  </Link>
                ) : (
                  <Link
                    href={`/livraisons/${l.id}`}
                    className="hover:underline"
                  >
                    {c?.raison_sociale ?? "—"}
                  </Link>
                )}
              </CardTitle>
              {c?.contact ? (
                <p className="text-sm text-muted-foreground">{c.contact}</p>
              ) : null}
            </div>
            <Badge variant={STATUT_VARIANT[l.statut as StatutLivraison]}>
              {STATUT_LABEL[l.statut as StatutLivraison]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(c?.adresse || c?.ville) ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0 mt-0.5" />
              <span>
                {c?.adresse ?? ""}
                {c?.adresse && (c?.code_postal || c?.ville) ? ", " : ""}
                {c?.code_postal ?? ""} {c?.ville ?? ""}
              </span>
            </p>
          ) : null}
          {c?.telephone ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" />
              <a
                href={`tel:${c.telephone}`}
                className="relative z-10 hover:underline"
              >
                {c.telephone}
              </a>
            </p>
          ) : null}
          {l.notes ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
              {l.notes}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-muted-foreground">
              {nbUnites} unités · {(l.lignes_livraison ?? []).length} ligne(s)
            </p>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{formatEUR(total)}</span>
              {mode === "disponible" ? (
                <ClaimButton id={l.id} clientNom={c?.raison_sociale ?? ""} />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  });
}

// Composant export inutilise, juste pour cohérence visuelle si on rajoute des actions
export { UserPlus };
