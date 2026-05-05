import Link from "next/link";
import { CheckCircle2, ChevronRight, MapPin, Phone } from "lucide-react";
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

export const metadata = { title: "Ma tournée du jour" };

export default async function TourneePage() {
  const { profile, supabase, user } = await requireRole("patron", "livreur");

  // Patron voit toutes les livraisons du jour, Livreur uniquement les siennes
  const today = new Date().toISOString().slice(0, 10);
  let request = supabase
    .from("livraisons")
    .select(
      `
      id, date_prevue, statut, notes,
      clients(raison_sociale, contact, adresse, ville, code_postal, telephone),
      lignes_livraison(qte, prix_unitaire_ht)
      `,
    )
    .eq("date_prevue", today)
    .in("statut", ["programmee", "en_cours"])
    .order("created_at");

  if (profile.role === "livreur") {
    request = request.eq("livreur_id", user.id);
  }

  const { data: livraisons } = await request;

  return (
    <div>
      <PageHeader
        title="Ma tournée du jour"
        description={`Livraisons à effectuer le ${formatDate(today)}.`}
      />

      {livraisons && livraisons.length > 0 ? (
        <div className="space-y-3">
          {livraisons.map((l) => {
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
                        {/* Lien "stretched" : couvre toute la carte sauf les
                            elements en z-10 (telephone). Pattern Bootstrap-like. */}
                        <Link
                          href={`/livraisons/${l.id}`}
                          className="before:absolute before:inset-0 before:content-['']"
                        >
                          {c?.raison_sociale ?? "—"}
                        </Link>
                      </CardTitle>
                      {c?.contact ? (
                        <p className="text-sm text-muted-foreground">
                          {c.contact}
                        </p>
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
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-muted-foreground">
                      {nbUnites} unités · {(l.lignes_livraison ?? []).length} ligne(s)
                    </p>
                    <div className="flex items-center gap-2 font-semibold">
                      {formatEUR(total)}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <p>Aucune livraison à effectuer aujourd&apos;hui.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
