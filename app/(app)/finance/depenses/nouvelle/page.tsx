import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { DepenseForm } from "./depense-form";

export const metadata = { title: "Nouvelle dépense · Finance" };

export default async function NouvelleDepensePage() {
  await requireRole("patron");
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
        description="Saisir une dépense de l'entreprise. Le justificatif (photo de ticket / PDF) est optionnel mais recommandé."
      />
      <DepenseForm />
    </div>
  );
}
