import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Livraisons · Gestion Boissons" };

export default async function LivraisonsPage() {
  await requireRole("patron", "fabrication", "livreur");
  return (
    <PagePlaceholder
      title="Livraisons"
      phase="Phase 3"
      description="Création de livraisons, tournée du jour, validation terrain et bons de livraison."
    />
  );
}
