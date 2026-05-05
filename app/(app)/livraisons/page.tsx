import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatEUR } from "@/lib/utils/format";
import {
  STATUTS_LIVRAISON,
  STATUT_LABEL,
  STATUT_BADGE_CLASS,
  MODE_LABEL,
  type StatutLivraison,
  type ModePaiement,
} from "./schemas";

export const metadata = { title: "Livraisons · Gestion Boissons" };

type SearchParams = Promise<{ q?: string; statut?: string }>;

export default async function LivraisonsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile, supabase } = await requireRole("patron", "fabrication", "livreur");
  const canCreate = profile.role === "patron" || profile.role === "fabrication";
  const { q, statut } = await searchParams;

  let request = supabase
    .from("livraisons")
    .select(
      "id, date_prevue, date_livraison, statut, notes, clients(raison_sociale, ville), lignes_livraison(qte, prix_unitaire_ht)",
    )
    .order("date_prevue", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (statut && STATUTS_LIVRAISON.includes(statut as StatutLivraison)) {
    request = request.eq("statut", statut);
  }

  const { data: livraisons } = await request;

  // Filtre client cote node (pas trivial via .or() avec joins)
  const filtered = q
    ? livraisons?.filter((l) => {
        const c = Array.isArray(l.clients) ? l.clients[0] : l.clients;
        const t = q.toLowerCase();
        return (
          c?.raison_sociale?.toLowerCase().includes(t) ||
          c?.ville?.toLowerCase().includes(t)
        );
      })
    : livraisons;

  // Mode de paiement par livraison (via la facture liee + ses paiements)
  const livraisonIds = (filtered ?? []).map((l) => l.id);
  const { data: facturesPaiements } = livraisonIds.length
    ? await supabase
        .from("factures")
        .select("livraison_id, paiements(mode)")
        .in("livraison_id", livraisonIds)
    : { data: [] };
  const modesParLivraison = new Map<string, Set<ModePaiement>>();
  for (const f of facturesPaiements ?? []) {
    const set = new Set<ModePaiement>();
    for (const p of f.paiements ?? []) {
      set.add(p.mode as ModePaiement);
    }
    if (set.size > 0) modesParLivraison.set(f.livraison_id, set);
  }

  return (
    <div>
      <PageHeader
        title="Livraisons"
        description="Liste des livraisons : programmées, en cours, livrées, annulées."
        actions={
          canCreate ? (
            <Link
              href="/livraisons/nouvelle"
              className={buttonVariants({ size: "default" })}
            >
              <Plus className="size-4" />
              Nouvelle livraison
            </Link>
          ) : null
        }
      />

      <form className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Rechercher par client ou ville…"
            className="pl-9"
          />
        </div>
        <select
          name="statut"
          defaultValue={statut ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {STATUTS_LIVRAISON.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filtrer
        </button>
      </form>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date prévue</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Lignes</TableHead>
              <TableHead className="text-right">Total HT</TableHead>
              <TableHead className="pl-6">Mode paiement</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered && filtered.length > 0 ? (
              filtered.map((l) => {
                const client = Array.isArray(l.clients) ? l.clients[0] : l.clients;
                const total = (l.lignes_livraison ?? []).reduce(
                  (acc, lg) => acc + Number(lg.qte) * Number(lg.prix_unitaire_ht),
                  0,
                );
                const nbLignes = (l.lignes_livraison ?? []).length;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(l.date_prevue)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/livraisons/${l.id}`}
                        className="hover:underline"
                      >
                        {client?.raison_sociale ?? "—"}
                      </Link>
                      {client?.ville ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {client.ville}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {nbLignes}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatEUR(total)}
                    </TableCell>
                    <TableCell className="pl-6 text-muted-foreground">
                      {(() => {
                        const modes = Array.from(modesParLivraison.get(l.id) ?? []);
                        if (modes.length === 0) return "—";
                        return modes.map((m) => MODE_LABEL[m]).join(" + ");
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUT_BADGE_CLASS[l.statut as StatutLivraison]}>
                        {STATUT_LABEL[l.statut as StatutLivraison]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucune livraison.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
