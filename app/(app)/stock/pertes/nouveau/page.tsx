import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { PerteForm } from "./perte-form";

export const metadata = { title: "Saisir une perte · Stock" };

type SearchParams = Promise<{ lot?: string }>;

export default async function NouvellePertePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireRole("patron", "adjoint", "fabrication", "livreur");
  const { lot: lotPreselected } = await searchParams;

  // Charge tous les lots avec stock dispo > 0 (impossible de declarer
  // une perte sur un lot deja vide).
  const { data: lots } = await supabase
    .from("stock_par_lot")
    .select("lot_id, produit_id, qte_disponible, dluo, numero_lot")
    .gt("qte_disponible", 0)
    .order("dluo");

  const produitIds = [...new Set((lots ?? []).map((l) => l.produit_id))];
  const { data: produits } = produitIds.length
    ? await supabase
        .from("produits")
        .select("id, nom, format")
        .in("id", produitIds)
    : { data: [] };

  const produitMap = new Map(produits?.map((p) => [p.id, p]) ?? []);
  const lotsAvecLabel = (lots ?? []).map((l) => {
    const p = produitMap.get(l.produit_id);
    return {
      id: l.lot_id,
      qte_disponible: l.qte_disponible,
      label: `${p?.nom ?? "—"} ${p?.format ?? ""}${l.numero_lot ? ` · ${l.numero_lot}` : ""} · à conso. avant ${new Date(l.dluo).toLocaleDateString("fr-FR")} (${l.qte_disponible} dispo)`,
    };
  });

  const backHref = lotPreselected ? `/stock/lots/${lotPreselected}` : "/stock";

  return (
    <div>
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {lotPreselected ? "Retour au lot" : "Retour au stock"}
      </Link>
      <PageHeader
        title="Saisir une perte"
        description="Casse, péremption, retour client, ajustement. Le mouvement est irréversible (journal append-only)."
      />
      <PerteForm lots={lotsAvecLabel} preselectedLotId={lotPreselected} />
    </div>
  );
}
