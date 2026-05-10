import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParametresForm } from "./parametres-form";

export const metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const { profile, supabase } = await requireRole("patron", "adjoint");

  const { data } = await supabase
    .from("parametres_entreprise")
    .select("tarif_consigne_eur, updated_at")
    .eq("id", true)
    .maybeSingle();

  const tarifConsigne = Number(data?.tarif_consigne_eur ?? 0.05);

  return (
    <div>
      <Link
        href="/admin"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à l&apos;administration
      </Link>

      <PageHeader
        title="Paramètres"
        description="Réglages globaux appliqués à toute l'application."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consigne</CardTitle>
            <CardDescription>
              Montant crédité au client pour chaque bouteille / flacon vide
              rapporté. Saisi au moment de marquer une livraison « livrée »,
              déduit automatiquement de la facture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ParametresForm
              tarifConsigneInitial={tarifConsigne}
              readonly={profile.role !== "patron"}
            />
            {profile.role !== "patron" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Seul le Patron peut modifier ce paramètre.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
