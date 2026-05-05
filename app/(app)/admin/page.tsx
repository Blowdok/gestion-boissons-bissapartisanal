import { requireRole } from "@/lib/auth/guards";
import { PagePlaceholder } from "@/components/layout/page-header";

export const metadata = { title: "Admin · Gestion Boissons" };

export default async function AdminPage() {
  await requireRole("patron");
  return (
    <PagePlaceholder
      title="Administration"
      phase="Phase 1 (suite)"
      description="Gestion des utilisateurs (création, désactivation) et catalogue des produits."
    />
  );
}
