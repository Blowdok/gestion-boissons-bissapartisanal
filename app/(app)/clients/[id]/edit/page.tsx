import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "../../client-form";
import { updateClient } from "../../actions";

export const metadata = { title: "Modifier client · Gestion Boissons" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("patron", "adjoint", "livreur");

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const action = updateClient.bind(null, id);

  return (
    <div>
      <Link
        href={`/clients/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à la fiche
      </Link>

      <PageHeader
        title={`Modifier — ${client.raison_sociale}`}
        description="Modifie les informations de la fiche client."
      />
      <div className="max-w-3xl">
        <ClientForm action={action} initial={client} submitLabel="Enregistrer" />
      </div>
    </div>
  );
}
