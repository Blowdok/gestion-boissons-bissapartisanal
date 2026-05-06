import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Clients · Gestion Boissons" };

type SearchParams = Promise<{ q?: string; inactifs?: string }>;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Production peut consulter les clients en lecture pour preparer les commandes
  const { profile, supabase } = await requireRole(
    "patron",
    "adjoint",
    "livreur",
    "fabrication",
  );
  const { q, inactifs } = await searchParams;
  const query = q?.trim() ?? "";
  const showInactifs = inactifs === "1";
  // Livreur peut creer/editer (commercial sur le terrain), Production en lecture
  const canWrite =
    profile.role === "patron" ||
    profile.role === "adjoint" ||
    profile.role === "livreur";

  let request = supabase
    .from("clients")
    .select("id, raison_sociale, contact, ville, telephone, email, actif")
    .order("raison_sociale");

  if (!showInactifs) request = request.eq("actif", true);
  if (query) {
    request = request.or(
      `raison_sociale.ilike.%${query}%,ville.ilike.%${query}%,contact.ilike.%${query}%`,
    );
  }

  const { data: clients, error } = await request;

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Annuaire des clients B2B et tarifs négociés."
        actions={
          canWrite ? (
            <Link
              href="/clients/nouveau"
              className={buttonVariants({ size: "default" })}
            >
              <Plus className="size-4" />
              Nouveau client
            </Link>
          ) : null
        }
      />

      <form className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Rechercher par raison sociale, ville, contact…"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="inactifs"
            value="1"
            defaultChecked={showInactifs}
            className="size-4"
          />
          Inclure les clients inactifs
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filtrer
        </button>
      </form>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      ) : null}

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Raison sociale</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients && clients.length > 0 ? (
              clients.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.raison_sociale}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.contact ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.ville ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.telephone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.actif ? (
                      <Badge variant="secondary">Actif</Badge>
                    ) : (
                      <Badge variant="outline">Inactif</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {query
                    ? `Aucun client ne correspond à « ${query} ».`
                    : "Aucun client enregistré."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
