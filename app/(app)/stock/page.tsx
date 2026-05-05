import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Stock · Gestion Boissons" };

export default async function StockPage() {
  await requireRole("patron", "fabrication", "livreur");
  return (
    <PagePlaceholder
      title="Stock"
      phase="Phase 2"
      description="Vue temps réel par parfum et par lot. Alertes seuil et historique des mouvements."
    />
  );
}
