import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { LivraisonForm } from "./livraison-form";
import { formatNomRole, type Role } from "@/lib/auth/roles";

export const metadata = { title: "Nouvelle livraison" };

export default async function NouvelleLivraisonPage() {
  const { supabase } = await requireRole("patron", "adjoint", "fabrication", "livreur");

  const [
    { data: clients },
    { data: produits },
    { data: tarifs },
    { data: livreurs },
    { data: stocks },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, raison_sociale, ville")
      .eq("actif", true)
      .order("raison_sociale"),
    supabase
      .from("produits")
      .select("id, nom, gamme, format, prix_defaut_ht, seuil_alerte")
      .eq("actif", true)
      .order("gamme")
      .order("nom"),
    supabase
      .from("tarifs_clients")
      .select("client_id, produit_id, prix_ht"),
    supabase
      .from("profiles")
      .select("id, nom, role")
      .in("role", ["patron", "adjoint", "livreur"])
      .eq("actif", true)
      .order("nom"),
    supabase
      .from("stock_par_produit")
      .select("produit_id, qte_disponible"),
  ]);

  return (
    <div>
      <Link
        href="/livraisons"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux livraisons
      </Link>
      <PageHeader
        title="Nouvelle livraison"
        description="Sélectionne un client et ajoute les lignes. Les prix négociés s'appliquent automatiquement."
      />
      <LivraisonForm
        clients={clients ?? []}
        produits={(produits ?? []).map((p) => {
          const stock = (stocks ?? []).find((s) => s.produit_id === p.id);
          return {
            id: p.id,
            nom: p.nom,
            gamme: p.gamme,
            format: p.format,
            prix_defaut_ht: Number(p.prix_defaut_ht),
            seuil_alerte: p.seuil_alerte,
            stock_disponible: stock?.qte_disponible ?? 0,
          };
        })}
        tarifs={(tarifs ?? []).map((t) => ({
          ...t,
          prix_ht: Number(t.prix_ht),
        }))}
        livreurs={(livreurs ?? []).map((l) => ({
          id: l.id,
          nom: formatNomRole(l.nom, l.role as Role),
        }))}
      />
    </div>
  );
}
