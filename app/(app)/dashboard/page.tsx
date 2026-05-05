import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Tableau de bord · Gestion Boissons" };

export default async function DashboardPage() {
  await requireRole("patron");
  return (
    <PagePlaceholder
      title="Tableau de bord"
      phase="Phase 4"
      description="CA du mois, dépenses, marge, comparatif M-1, top clients et top produits."
    />
  );
}
