"use client";

import { useActionState, useMemo, useState } from "react";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEUR } from "@/lib/utils/format";
import { createLivraison, type ActionState } from "../actions";

const GAMME_LABEL: Record<string, string> = {
  bissapa: "Bissapa",
  zandjabila: "Zandjabila",
};

type Client = { id: string; raison_sociale: string; ville: string | null };
type Produit = {
  id: string;
  nom: string;
  gamme: string;
  format: string;
  prix_defaut_ht: number;
  seuil_alerte: number;
  stock_disponible: number;
};
type Tarif = { client_id: string; produit_id: string; prix_ht: number };
type Livreur = { id: string; nom: string };

type Ligne = {
  produit_id: string;
  qte: number;
  prix_unitaire_ht: number;
};

export function LivraisonForm({
  clients,
  produits,
  tarifs,
  livreurs,
}: {
  clients: Client[];
  produits: Produit[];
  tarifs: Tarif[];
  livreurs: Livreur[];
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createLivraison,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [lignes, setLignes] = useState<Ligne[]>([]);

  // Map produit_id -> prix applique pour le client courant
  const prixAppliques = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of produits) map.set(p.id, p.prix_defaut_ht);
    for (const t of tarifs) {
      if (t.client_id === clientId) map.set(t.produit_id, t.prix_ht);
    }
    return map;
  }, [clientId, produits, tarifs]);

  const total = lignes.reduce((acc, l) => acc + l.qte * l.prix_unitaire_ht, 0);

  // Bloque le submit si au moins une ligne depasse le stock dispo (le trigger
  // SQL bloquerait de toute facon, autant prevenir cote UI).
  const aLigneInvalide = lignes.some((l) => {
    const p = produits.find((pp) => pp.id === l.produit_id);
    return p ? l.qte > p.stock_disponible : false;
  });

  const today = new Date().toISOString().slice(0, 10);

  function addLigne() {
    if (produits.length === 0) return;
    const premierNonAjoute = produits.find(
      (p) => !lignes.some((l) => l.produit_id === p.id),
    );
    if (!premierNonAjoute) return;
    setLignes([
      ...lignes,
      {
        produit_id: premierNonAjoute.id,
        qte: 1,
        prix_unitaire_ht: prixAppliques.get(premierNonAjoute.id) ?? premierNonAjoute.prix_defaut_ht,
      },
    ]);
  }

  function updateLigne(index: number, patch: Partial<Ligne>) {
    setLignes((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const next = { ...l, ...patch };
        // Si le produit change, applique le prix du client
        if (patch.produit_id && patch.produit_id !== l.produit_id) {
          next.prix_unitaire_ht = prixAppliques.get(patch.produit_id) ?? 0;
        }
        return next;
      }),
    );
  }

  function removeLigne(index: number) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  const produitsRestants = produits.filter(
    (p) => !lignes.some((l) => l.produit_id === p.id),
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="client_id">Client *</Label>
          <Select
            name="client_id"
            value={clientId}
            onValueChange={(v) => setClientId(v ?? "")}
            disabled={pending}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.raison_sociale}
                  {c.ville ? ` · ${c.ville}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.client_id ? <p className="mt-1 text-xs text-destructive">{fe.client_id}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date_prevue">Date prévue *</Label>
            <Input
              id="date_prevue"
              name="date_prevue"
              type="date"
              required
              defaultValue={today}
              className="mt-2"
              disabled={pending}
            />
            {fe.date_prevue ? (
              <p className="mt-1 text-xs text-destructive">{fe.date_prevue}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="heure_prevue">Heure (optionnel)</Label>
            <Input
              id="heure_prevue"
              name="heure_prevue"
              type="time"
              className="mt-2"
              disabled={pending}
            />
            {fe.heure_prevue ? (
              <p className="mt-1 text-xs text-destructive">{fe.heure_prevue}</p>
            ) : null}
          </div>
        </div>

        <div>
          <Label htmlFor="livreur_id">Livreur (optionnel)</Label>
          <Select name="livreur_id" disabled={pending} defaultValue="">
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Non assigné</SelectItem>
              {livreurs.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Précisions livraison, accès, contact sur place…"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label>Lignes de livraison *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLigne}
            disabled={pending || produitsRestants.length === 0}
          >
            <Plus className="size-4" />
            Ajouter une ligne
          </Button>
        </div>

        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="w-32 text-right">Quantité</TableHead>
                <TableHead className="w-40 text-right">Prix unit. HT</TableHead>
                <TableHead className="w-32 text-right">Sous-total HT</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground text-sm">
                    Aucune ligne. Clique « Ajouter une ligne ».
                  </TableCell>
                </TableRow>
              ) : (
                lignes.map((l, index) => {
                  const sousTotal = l.qte * l.prix_unitaire_ht;
                  const dispo = produits.filter(
                    (p) => p.id === l.produit_id || !lignes.some((ll, i) => ll.produit_id === p.id && i !== index),
                  );
                  const produit = produits.find((p) => p.id === l.produit_id);
                  const stockDispo = produit?.stock_disponible ?? 0;
                  const seuil = produit?.seuil_alerte ?? 0;
                  const depasseStock = produit ? l.qte > stockDispo : false;
                  const passeSousSeuil =
                    produit && !depasseStock && stockDispo - l.qte < seuil;
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={l.produit_id}
                          onValueChange={(v) => updateLigne(index, { produit_id: v ?? "" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dispo.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nom} — {GAMME_LABEL[p.gamme] ?? p.gamme} {p.format}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  · {p.stock_disponible} dispo
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={l.qte}
                          onChange={(e) =>
                            updateLigne(index, { qte: Number(e.target.value) || 0 })
                          }
                          className={`text-right ${
                            depasseStock
                              ? "border-destructive focus-visible:ring-destructive/40"
                              : passeSousSeuil
                                ? "border-amber-500 focus-visible:ring-amber-500/40"
                                : ""
                          }`}
                          aria-invalid={depasseStock}
                        />
                        {depasseStock ? (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                            <AlertTriangle className="size-3" />
                            Stock insuffisant : {stockDispo} dispo
                          </p>
                        ) : passeSousSeuil ? (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-500">
                            <AlertTriangle className="size-3" />
                            Passera sous le seuil ({seuil}) — restera{" "}
                            {stockDispo - l.qte}
                          </p>
                        ) : produit ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {stockDispo} dispo · restera {stockDispo - l.qte}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.prix_unitaire_ht}
                          onChange={(e) =>
                            updateLigne(index, {
                              prix_unitaire_ht: Number(e.target.value) || 0,
                            })
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEUR(sousTotal)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLigne(index)}
                          aria-label="Retirer"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {lignes.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total HT
                  </TableCell>
                  <TableCell className="text-right text-lg font-semibold">
                    {formatEUR(total)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        {fe.lignes ? (
          <p className="mt-1 text-xs text-destructive">{fe.lignes}</p>
        ) : null}
      </div>

      {/* Hidden field qui sérialise les lignes pour le Server Action */}
      <input type="hidden" name="lignes" value={JSON.stringify(lignes)} />

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {aLigneInvalide ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Au moins une ligne dépasse le stock disponible. Corrige les
          quantités avant de créer la livraison.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending || lignes.length === 0 || aLigneInvalide}
        >
          {pending ? "Création…" : "Créer la livraison"}
        </Button>
      </div>
    </form>
  );
}
