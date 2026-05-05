import { notFound } from "next/navigation";
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
  const { supabase } = await requireRole("patron");

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const action = updateClient.bind(null, id);

  return (
    <div>
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
