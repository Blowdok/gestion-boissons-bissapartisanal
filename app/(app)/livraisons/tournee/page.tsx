import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Ma tournée · Gestion Boissons" };

export default async function TourneePage() {
  await requireRole("patron", "livreur");
  return (
    <PagePlaceholder
      title="Ma tournée du jour"
      phase="Phase 3"
      description="Liste ordonnée des livraisons à effectuer aujourd'hui, validation terrain (statut, encaissement, signature)."
    />
  );
}
