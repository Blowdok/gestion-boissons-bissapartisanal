import Link from "next/link";
import { Users, Package, ChevronRight, AlertTriangle, Settings } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { profile, supabase } = await requireRole("patron", "adjoint");

  const [
    { count: nbUtilisateursActifs },
    { count: nbUtilisateursTotal },
    { count: nbProduitsActifs },
    { count: nbProduitsTotal },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("actif", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("produits").select("*", { count: "exact", head: true }).eq("actif", true),
    supabase.from("produits").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Gestion des utilisateurs et du catalogue des produits."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AdminCard
          href="/admin/utilisateurs"
          title="Utilisateurs"
          description="Comptes Patron, Fabrication et Livreur."
          icon={<Users className="size-5" />}
          stat={`${nbUtilisateursActifs ?? 0} actifs / ${nbUtilisateursTotal ?? 0} total`}
        />
        <AdminCard
          href="/admin/produits"
          title="Catalogue produits"
          description="Bissapa, Zandjabila — prix, formats et seuils d'alerte."
          icon={<Package className="size-5" />}
          stat={`${nbProduitsActifs ?? 0} actifs / ${nbProduitsTotal ?? 0} total`}
        />
        <AdminCard
          href="/admin/parametres"
          title="Paramètres"
          description="Tarif consigne et autres réglages globaux."
          icon={<Settings className="size-5" />}
          stat="Tarif consigne, etc."
        />
      </div>

      {/* Zone sensible reservee Patron : reset des donnees operationnelles */}
      {profile.role === "patron" ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Zone sensible
          </h2>
          <Link href="/admin/reset" className="block">
            <Card className="border-destructive/30 transition-colors hover:bg-destructive/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <AlertTriangle className="size-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">
                        Réinitialiser les données opérationnelles
                      </CardTitle>
                      <CardDescription>
                        Vide livraisons, factures, paiements, lots et
                        dépenses. Conserve utilisateurs, clients et produits.
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function AdminCard({
  href,
  title,
  description,
  icon,
  stat,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stat: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-muted/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                {icon}
              </span>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{stat}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
