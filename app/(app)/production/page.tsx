import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Production · Gestion Boissons" };

export default async function ProductionPage() {
  await requireRole("patron", "fabrication");
  return (
    <PagePlaceholder
      title="Production"
      phase="Phase 2"
      description="Saisie des lots de production avec produit, date, quantité et DLUO."
    />
  );
}
