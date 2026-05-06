import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatEUR } from "@/lib/utils/format";
import { ListeDepenses } from "./depenses/liste-depenses";
import type { CategorieDepense } from "./depenses/schemas";

export const metadata = { title: "Finance · Gestion Boissons" };

export default async function FinancePage() {
  const { supabase } = await requireRole("patron");

  const moisCourant = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [{ data: depenses }, { data: depenseMois }] = await Promise.all([
    supabase
      .from("depenses")
      .select("id, date, montant, categorie, description, justificatif_path")
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("depenses_mensuelles")
      .select("depenses_total")
      .eq("mois", moisCourant)
      .maybeSingle(),
  ]);

  const totalMois = Number(depenseMois?.depenses_total ?? 0);

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Dépenses du mois ({moisCourant})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{formatEUR(totalMois)}</p>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Dernières dépenses
      </h2>
      <ListeDepenses
        depenses={(depenses ?? []).map((d) => ({
          id: d.id,
          date: d.date,
          montant: Number(d.montant),
          categorie: d.categorie as CategorieDepense,
          description: d.description,
          justificatif_path: d.justificatif_path,
        }))}
      />
    </div>
  );
}
