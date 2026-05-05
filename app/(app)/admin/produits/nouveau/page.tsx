import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { ProduitForm } from "../produit-form";
import { createProduit } from "../actions";

export const metadata = { title: "Nouveau produit · Admin" };

export default async function NouveauProduitPage() {
  await requireRole("patron");
  return (
    <div>
      <Link
        href="/admin/produits"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour au catalogue
      </Link>
      <PageHeader title="Nouveau produit" description="Ajouter une référence au catalogue." />
      <ProduitForm action={createProduit} submitLabel="Créer le produit" />
    </div>
  );
}
