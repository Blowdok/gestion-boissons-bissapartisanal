"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
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
import { createDepense, type ActionState } from "../actions";
import {
  CATEGORIES_DEPENSE,
  CATEGORIE_HINTS,
  CATEGORIE_LABELS,
  type CategorieDepense,
} from "../schemas";
import {
  defaultSourcePourCategorie,
  MODES_PAIEMENT_DEPENSE,
  MODE_DEPENSE_LABELS,
  SOURCES_FONDS,
  SOURCE_DESCRIPTIONS,
  SOURCE_LABELS,
  type ModePaiementDepense,
  type SourceFonds,
} from "@/lib/domain/source-fonds";

// Ligne de paiement éditée par l'utilisateur dans le formulaire.
type PaiementLigne = {
  id: string; // identifiant local pour les keys React
  montant: string;
  date_prevue: string;
  date_effectif: string;
  mode: ModePaiementDepense;
  note: string;
};

const newLigne = (montant = ""): PaiementLigne => ({
  id: crypto.randomUUID(),
  montant,
  date_prevue: "",
  date_effectif: "",
  mode: "virement",
  note: "",
});

export function DepenseForm() {
  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(createDepense, undefined);
  const fe = state?.fieldErrors ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [montant, setMontant] = useState<string>("");
  const [categorie, setCategorie] =
    useState<CategorieDepense>("matieres_premieres");
  const [sourceFonds, setSourceFonds] = useState<SourceFonds>(
    defaultSourcePourCategorie("matieres_premieres"),
  );
  // Permet de savoir si l'utilisateur a explicitement modifié la source
  // (sinon on continue à la synchroniser avec la catégorie)
  const [sourceManuelle, setSourceManuelle] = useState(false);
  const [description, setDescription] = useState<string>("");
  const [filename, setFilename] = useState<string>("");

  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);

  const handleCategorieChange = (v: CategorieDepense) => {
    setCategorie(v);
    if (!sourceManuelle) {
      setSourceFonds(defaultSourcePourCategorie(v));
    }
  };

  const handleSourceChange = (v: SourceFonds) => {
    setSourceFonds(v);
    setSourceManuelle(true);
  };

  const ajouterPaiement = () => {
    const total = Number(montant) || 0;
    const dejaProgramme = paiements.reduce(
      (acc, p) => acc + (Number(p.montant) || 0),
      0,
    );
    const reste = Math.max(0, total - dejaProgramme);
    setPaiements((p) => [
      ...p,
      newLigne(reste > 0 ? reste.toFixed(2) : ""),
    ]);
  };

  const retirerPaiement = (id: string) =>
    setPaiements((p) => p.filter((x) => x.id !== id));

  const updateLigne = (id: string, patch: Partial<PaiementLigne>) =>
    setPaiements((arr) =>
      arr.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );

  const sommePaiements = useMemo(
    () =>
      paiements.reduce((acc, p) => acc + (Number(p.montant) || 0), 0),
    [paiements],
  );
  const total = Number(montant) || 0;
  const reste = total - sommePaiements;

  // Sérialisation des paiements pour la server action (FormData supporte
  // mal les structures complexes : on les passe en JSON dans un champ).
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // L'attribut "action" reste relié à useActionState ; on ajoute juste
    // les paiements_json en valeur sérialisée avant submission native.
    const form = e.currentTarget;
    const existing = form.querySelector<HTMLInputElement>(
      'input[name="paiements_json"]',
    );
    const payload = JSON.stringify(
      paiements
        .filter(
          (p) =>
            (p.montant ?? "").trim() !== "" &&
            (p.date_prevue || p.date_effectif),
        )
        .map((p) => ({
          montant: p.montant,
          date_prevue: p.date_prevue || undefined,
          date_effectif: p.date_effectif || undefined,
          mode: p.mode,
          note: p.note,
        })),
    );
    if (existing) existing.value = payload;
  };

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-6"
    >
      <input type="hidden" name="paiements_json" defaultValue="[]" />

      {/* Bloc 1 : informations générales de la dépense */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Date d&apos;engagement *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="mt-2"
            disabled={pending}
          />
          {fe.date ? (
            <p className="mt-1 text-xs text-destructive">{fe.date}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="montant">Montant total € *</Label>
          <Input
            id="montant"
            name="montant"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="ex : 45,80"
            className="mt-2"
            disabled={pending}
          />
          {fe.montant ? (
            <p className="mt-1 text-xs text-destructive">{fe.montant}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="categorie">Catégorie *</Label>
          <Select
            name="categorie"
            value={categorie}
            onValueChange={(v) =>
              handleCategorieChange((v ?? "autres") as CategorieDepense)
            }
            disabled={pending}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES_DEPENSE.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {CATEGORIE_HINTS[categorie] ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {CATEGORIE_HINTS[categorie]}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="source_fonds" className="flex items-center gap-1.5">
            <Wallet className="size-3.5" />
            Enveloppe (source des fonds) *
          </Label>
          <Select
            name="source_fonds"
            value={sourceFonds}
            onValueChange={(v) => handleSourceChange(v as SourceFonds)}
            disabled={pending}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES_FONDS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            {SOURCE_DESCRIPTIONS[sourceFonds]}
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex : 10 kg de fleurs d'hibiscus chez Maraîcher Réunion"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          />
          {fe.description ? (
            <p className="mt-1 text-xs text-destructive">{fe.description}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="justificatif">
            Justificatif (photo ou PDF, max 5 Mo)
          </Label>
          <Input
            id="justificatif"
            name="justificatif"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={(e) => setFilename(e.target.files?.[0]?.name ?? "")}
            className="mt-2"
            disabled={pending}
          />
          {filename ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Fichier sélectionné : <strong>{filename}</strong>
            </p>
          ) : null}
          {fe.justificatif ? (
            <p className="mt-1 text-xs text-destructive">{fe.justificatif}</p>
          ) : null}
        </div>
      </div>

      {/* Bloc 2 : paiements / échéances (optionnel) */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Paiements & échéances</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ajoutez 0, 1 ou plusieurs lignes selon le mode de règlement
              (comptant, à échéance, en plusieurs fois). Une ligne sans
              date n&apos;est pas valide. Vous pouvez aussi laisser vide
              et enregistrer les paiements plus tard depuis la fiche.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={ajouterPaiement}
            disabled={pending || total <= 0}
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>

        {paiements.length === 0 ? (
          <p className="rounded-md border border-dashed bg-background/50 p-4 text-center text-xs text-muted-foreground">
            Aucun paiement saisi — la dépense sera créée avec le statut
            « à payer ».
          </p>
        ) : (
          <div className="space-y-2">
            {paiements.map((p, idx) => (
              <div
                key={p.id}
                className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-2">
                  <Label className="text-xs" htmlFor={`montant-${p.id}`}>
                    Montant € *
                  </Label>
                  <Input
                    id={`montant-${p.id}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={p.montant}
                    onChange={(e) =>
                      updateLigne(p.id, { montant: e.target.value })
                    }
                    disabled={pending}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs" htmlFor={`prevue-${p.id}`}>
                    Date prévue
                  </Label>
                  <Input
                    id={`prevue-${p.id}`}
                    type="date"
                    value={p.date_prevue}
                    onChange={(e) =>
                      updateLigne(p.id, { date_prevue: e.target.value })
                    }
                    disabled={pending}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs" htmlFor={`effectif-${p.id}`}>
                    Date effective
                  </Label>
                  <Input
                    id={`effectif-${p.id}`}
                    type="date"
                    value={p.date_effectif}
                    onChange={(e) =>
                      updateLigne(p.id, { date_effectif: e.target.value })
                    }
                    disabled={pending}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs" htmlFor={`mode-${p.id}`}>
                    Mode
                  </Label>
                  <Select
                    value={p.mode}
                    onValueChange={(v) =>
                      updateLigne(p.id, { mode: v as ModePaiementDepense })
                    }
                    disabled={pending}
                  >
                    <SelectTrigger
                      id={`mode-${p.id}`}
                      className="mt-1"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES_PAIEMENT_DEPENSE.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MODE_DEPENSE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-end sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => retirerPaiement(p.id)}
                    disabled={pending}
                    aria-label={`Retirer le paiement ${idx + 1}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <div className="sm:col-span-12">
                  <Label className="text-xs" htmlFor={`note-${p.id}`}>
                    Note (optionnelle)
                  </Label>
                  <Input
                    id={`note-${p.id}`}
                    type="text"
                    value={p.note}
                    onChange={(e) =>
                      updateLigne(p.id, { note: e.target.value })
                    }
                    placeholder="ex : acompte, 1ʳᵉ échéance, chèque n°123…"
                    disabled={pending}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}

            {/* Récap somme paiements vs total */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/50 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Total programmé : <strong>{sommePaiements.toFixed(2)} €</strong>{" "}
                / dépense : <strong>{total.toFixed(2)} €</strong>
              </span>
              <span
                className={
                  reste < -0.01
                    ? "font-medium text-destructive"
                    : reste > 0.01
                      ? "font-medium text-amber-600"
                      : "font-medium text-emerald-600"
                }
              >
                {reste < -0.01
                  ? `Dépassement de ${Math.abs(reste).toFixed(2)} €`
                  : reste > 0.01
                    ? `Reste ${reste.toFixed(2)} € à programmer`
                    : "Soldé"}
              </span>
            </div>
          </div>
        )}
      </div>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la dépense"}
      </Button>
    </form>
  );
}
