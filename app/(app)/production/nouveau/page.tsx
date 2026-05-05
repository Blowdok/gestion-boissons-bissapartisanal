import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { LotForm } from "../lot-form";

export const metadata = { title: "Nouveau lot · Production" };

export default async function NouveauLotPage() {
  const { supabase } = await requireRole("patron", "fabrication");

  const { data: produits } = await supabase
    .from("produits")
    .select("id, nom, gamme, format")
    .eq("actif", true)
    .order("gamme")
    .order("nom");

  return (
    <div>
      <Link
        href="/production"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à la production
      </Link>
      <PageHeader
        title="Nouveau lot de production"
        description="Saisie d'une production : un mouvement de stock 'production' est créé automatiquement."
      />
      <LotForm produits={produits ?? []} />
    </div>
  );
}
