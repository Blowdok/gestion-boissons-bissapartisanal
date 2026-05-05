import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Finance · Gestion Boissons" };

export default async function FinancePage() {
  await requireRole("patron");
  return (
    <PagePlaceholder
      title="Finance"
      phase="Phase 4"
      description="Saisie des dépenses, répartition automatique 50/30/20 et exports comptables."
    />
  );
}
