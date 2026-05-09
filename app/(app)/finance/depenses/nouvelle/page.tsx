import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { DepenseForm } from "./depense-form";

export const metadata = { title: "Nouvelle dépense · Finance" };

export default async function NouvelleDepensePage() {
  // Adjoint autorise : il peut saisir des depenses sur les enveloppes
  // Reinvestissement et Charges (le formulaire filtre les options).
  const { profile } = await requireRole("patron", "adjoint");
  return (
    <div>
      <Link
        href="/finance"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à la finance
      </Link>
      <PageHeader
        title="Nouvelle dépense"
        description={
          profile.role === "adjoint"
            ? "Saisir une dépense imputable sur Réinvestissement ou Charges. L'enveloppe Personnel est réservée au Patron."
            : "Saisir une dépense de l'entreprise. Le justificatif (photo de ticket / PDF) est optionnel mais recommandé."
        }
      />
      <DepenseForm currentUserRole={profile.role} />
    </div>
  );
}
