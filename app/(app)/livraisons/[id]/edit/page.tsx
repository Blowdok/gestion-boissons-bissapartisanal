import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { EditLivraisonForm } from "./edit-form";

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
    .select("id, date_prevue, livreur_id, notes, statut, clients(raison_sociale)")
    .eq("id", id)
    .maybeSingle();

  if (!livraison) notFound();

  const { data: livreurs } = await supabase
    .from("profiles")
    .select("id, nom")
    .in("role", ["patron", "adjoint", "livreur"])
    .eq("actif", true)
    .order("nom");

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
          livreur_id: livraison.livreur_id,
          notes: livraison.notes,
        }}
        livreurs={livreurs ?? []}
      />
    </div>
  );
}
