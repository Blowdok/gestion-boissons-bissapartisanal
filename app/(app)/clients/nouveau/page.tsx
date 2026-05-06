import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "../client-form";
import { createClient } from "../actions";

export const metadata = { title: "Nouveau client" };

export default async function NouveauClientPage() {
  await requireRole("patron", "adjoint", "livreur");
  return (
    <div>
      <Link
        href="/clients"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux clients
      </Link>

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
