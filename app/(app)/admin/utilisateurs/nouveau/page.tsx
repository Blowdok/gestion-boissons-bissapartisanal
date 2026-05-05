import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { UtilisateurForm } from "../utilisateur-form";

export const metadata = { title: "Nouvel utilisateur · Admin" };

export default async function NouveauUtilisateurPage() {
  await requireRole("patron");
  return (
    <div>
      <Link
        href="/admin/utilisateurs"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux utilisateurs
      </Link>
      <PageHeader
        title="Nouvel utilisateur"
        description="Créer un compte Patron, Fabrication ou Livreur."
      />
      <UtilisateurForm />
    </div>
  );
}
