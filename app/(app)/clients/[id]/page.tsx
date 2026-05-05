import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatEUR } from "@/lib/utils/format";
import { TarifsEditor } from "./tarifs-editor";
import { ClientStatutToggle } from "./statut-toggle";

export const metadata = { title: "Fiche client · Gestion Boissons" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, supabase } = await requireRole("patron", "livreur");
  const canWrite = profile.role === "patron";

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const { data: produits } = await supabase
    .from("produits")
    .select("id, nom, gamme, format, prix_defaut_ht, actif")
    .eq("actif", true)
    .order("gamme")
    .order("nom");

  const { data: tarifs } = await supabase
    .from("tarifs_clients")
    .select("produit_id, prix_ht")
    .eq("client_id", id);

  const tarifsMap = new Map(tarifs?.map((t) => [t.produit_id, Number(t.prix_ht)]) ?? []);

  return (
    <div>
      <Link
        href="/clients"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux clients
      </Link>

      <PageHeader
        title={client.raison_sociale}
        description={
          <>
            {client.ville ?? "—"}
            {client.actif ? null : (
              <Badge variant="outline" className="ml-2">
                Inactif
              </Badge>
            )}
          </>
        }
        actions={
          canWrite ? (
            <>
              <ClientStatutToggle
                id={client.id}
                actif={client.actif}
                raisonSociale={client.raison_sociale}
              />
              <Link
                href={`/clients/${id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="size-4" />
                Modifier
              </Link>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Contact" value={client.contact} />
            <Info label="Téléphone" value={client.telephone} />
            <Info label="Email" value={client.email} />
            <Info label="SIRET" value={client.siret} />
            <Info
              label="Adresse"
              value={
                [client.adresse, client.code_postal, client.ville]
                  .filter(Boolean)
                  .join(" ") || null
              }
              className="sm:col-span-2"
            />
            <Info
              label="Conditions de paiement"
              value={client.conditions_paiement}
              className="sm:col-span-2"
            />
            {client.notes ? (
              <Info label="Notes" value={client.notes} className="sm:col-span-2" />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Montants en cours et historique de livraisons disponibles à
              partir de la Phase 3.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <TarifsEditor
          clientId={client.id}
          canWrite={canWrite}
          produits={
            produits?.map((p) => ({
              id: p.id,
              nom: p.nom,
              gamme: p.gamme as "bissapa" | "zandjabila",
              format: p.format,
              prix_defaut_ht: Number(p.prix_defaut_ht),
              prix_negocie: tarifsMap.get(p.id) ?? null,
            })) ?? []
          }
        />
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

// Utilitaire de formatage EUR exporté pour les sous-composants
export { formatEUR };
