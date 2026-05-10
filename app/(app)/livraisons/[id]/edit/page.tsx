import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { EditLivraisonForm } from "./edit-form";
import { formatNomRole, type Role } from "@/lib/auth/roles";

export const metadata = { title: "Modifier livraison" };

export default async function EditLivraisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("patron", "adjoint", "fabrication");

  const { data: livraison } = await supabase
    .from("livraisons")
    .select("id, date_prevue, heure_prevue, livreur_id, notes, statut, clients(raison_sociale)")
    .eq("id", id)
    .maybeSingle();

  if (!livraison) notFound();

  const { data: livreursRaw } = await supabase
    .from("profiles")
    .select("id, nom, role")
    .in("role", ["patron", "adjoint", "livreur"])
    .eq("actif", true)
    .order("nom");
  const livreurs = (livreursRaw ?? []).map((l) => ({
    id: l.id,
    nom: formatNomRole(l.nom, l.role as Role),
  }));

  const client = Array.isArray(livraison.clients)
    ? livraison.clients[0]
    : livraison.clients;

  return (
    <div>
      <Link
        href={`/livraisons/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à la livraison
      </Link>
      <PageHeader
        title={`Modifier — ${client?.raison_sociale ?? "—"}`}
        description="Date prévue, livreur assigné et notes. Les lignes ne sont pas modifiables ici (annule la livraison et recrée-la si besoin)."
      />
      <EditLivraisonForm
        id={id}
        initial={{
          date_prevue: livraison.date_prevue,
          heure_prevue: livraison.heure_prevue,
          livreur_id: livraison.livreur_id,
          notes: livraison.notes,
        }}
        livreurs={livreurs}
      />
    </div>
  );
}
