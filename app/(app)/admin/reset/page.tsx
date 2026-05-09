import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Reset des données · Admin" };

export default async function ResetPage() {
  // Patron uniquement (pas l'Adjoint : action trop sensible)
  const { supabase } = await requireRole("patron");

  // Compteurs actuels pour donner du contexte avant le reset
  const [
    { count: nbLivraisons },
    { count: nbFactures },
    { count: nbPaiements },
    { count: nbLots },
    { count: nbDepenses },
  ] = await Promise.all([
    supabase.from("livraisons").select("id", { count: "exact", head: true }),
    supabase.from("factures").select("id", { count: "exact", head: true }),
    supabase.from("paiements").select("id", { count: "exact", head: true }),
    supabase.from("lots").select("id", { count: "exact", head: true }),
    supabase.from("depenses").select("id", { count: "exact", head: true }),
  ]);

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
        title="Réinitialiser les données opérationnelles"
        description="Vide toutes les données de production / vente pour repartir à zéro."
      />

      <div className="mb-6 rounded-md border-l-4 border-l-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              À utiliser uniquement pour basculer de la phase de tests à la
              mise en service réelle.
            </p>
            <p className="text-muted-foreground">
              Une fois en production, n&apos;utilise jamais ce bouton : tu
              perdrais l&apos;historique légal des factures (obligation de
              conservation 10 ans). Pour corriger une erreur, utilise plutôt
              les actions <strong>Annuler</strong> ou <strong>Supprimer</strong>{" "}
              ciblées sur chaque fiche.
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>État actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <Stat label="Livraisons" value={nbLivraisons ?? 0} />
            <Stat label="Factures" value={nbFactures ?? 0} />
            <Stat label="Paiements" value={nbPaiements ?? 0} />
            <Stat label="Lots de production" value={nbLots ?? 0} />
            <Stat label="Dépenses" value={nbDepenses ?? 0} />
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Les utilisateurs, clients, produits et tarifs négociés sont{" "}
            <strong>conservés</strong>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lancer la réinitialisation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetForm />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </li>
  );
}
