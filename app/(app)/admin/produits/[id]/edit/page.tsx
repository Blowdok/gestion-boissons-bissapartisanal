import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { ProduitForm } from "../../produit-form";
import { updateProduit } from "../../actions";
import type { Gamme } from "../../schemas";

export const metadata = { title: "Modifier produit · Admin" };

export default async function EditProduitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("patron", "adjoint");

  const { data: produit } = await supabase
    .from("produits")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!produit) notFound();

  const action = updateProduit.bind(null, id);

  return (
    <div>
      <Link
        href="/admin/produits"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour au catalogue
      </Link>
      <PageHeader
        title={`Modifier — ${produit.nom}`}
        description="Modifie le produit (nom, gamme, format, prix, seuil)."
      />
      <ProduitForm
        action={action}
        initial={{
          nom: produit.nom,
          gamme: produit.gamme as Gamme,
          format: produit.format,
          seuil_alerte: produit.seuil_alerte,
          prix_defaut_ht: Number(produit.prix_defaut_ht),
        }}
        submitLabel="Enregistrer"
      />
    </div>
  );
}
