import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { UtilisateurForm } from "../utilisateur-form";

export const metadata = { title: "Nouvel utilisateur · Admin" };

export default async function NouveauUtilisateurPage() {
  const { profile } = await requireRole("patron", "adjoint");
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
        description={
          profile.role === "adjoint"
            ? "Créer un compte Fabrication ou Livreur (Adjoint et Patron réservés au Patron)."
            : "Créer un compte Adjoint, Fabrication ou Livreur. Pour transmettre la qualité de Patron, promeus un compte existant via son menu (•••)."
        }
      />
      <UtilisateurForm currentUserRole={profile.role} />
    </div>
  );
}
