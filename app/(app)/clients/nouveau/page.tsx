import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "../client-form";
import { createClient } from "../actions";

export const metadata = { title: "Nouveau client · Gestion Boissons" };

export default async function NouveauClientPage() {
  await requireRole("patron");
  return (
    <div>
      <PageHeader
        title="Nouveau client"
        description="Créer une fiche client B2B."
      />
      <div className="max-w-3xl">
        <ClientForm action={createClient} submitLabel="Créer le client" />
      </div>
    </div>
  );
}
