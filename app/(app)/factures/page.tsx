import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Factures · Gestion Boissons" };

export default async function FacturesPage() {
  await requireRole("patron", "livreur");
  return (
    <PagePlaceholder
      title="Factures"
      phase="Phase 3"
      description="Liste des factures, suivi des paiements et impayés filtrables par ancienneté."
    />
  );
}
