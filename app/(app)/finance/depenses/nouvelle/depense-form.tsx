"use client";

import { useActionState, useState } from "react";
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
  CATEGORIE_LABELS,
  type CategorieDepense,
} from "../schemas";
import { ScanTicketButton, type TicketPrefill } from "./scan-ticket-button";
import { ModelPicker } from "@/components/ai/model-picker";
import { useModelPreference } from "@/lib/ai/use-model-preference";
import { MODELS } from "@/lib/ai/models";

// Modeles vision suggeres : rapides + multimodaux + accessibles
const RECOMMENDED_VISION = [
  MODELS.vision,
  "google/gemini-2.5-flash-lite",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5-mini",
];

export function DepenseForm() {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createDepense,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  const { model: visionModel, setModel: setVisionModel } = useModelPreference(
    "vision",
    MODELS.vision,
  );

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [montant, setMontant] = useState<string>("");
  const [categorie, setCategorie] = useState<CategorieDepense>("matieres_premieres");
  const [description, setDescription] = useState<string>("");
  const [filename, setFilename] = useState<string>("");

  // Pre-remplissage suite a un scan IA : on met a jour uniquement les
  // champs qui ont ete extraits avec succes
  const handleScanResult = (data: TicketPrefill) => {
    if (data.date) setDate(data.date);
    if (data.montant) setMontant(data.montant);
    if (data.categorie) setCategorie(data.categorie);
    if (data.description) setDescription(data.description);
  };

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Saisie rapide par photo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Scannez un ticket de caisse pour pré-remplir le formulaire
              automatiquement.
            </p>
          </div>
          <ScanTicketButton
            onResult={handleScanResult}
            disabled={pending}
            model={visionModel}
          />
        </div>
        <ModelPicker
          value={visionModel}
          onChange={setVisionModel}
          capability="vision"
          disabled={pending}
          recommended={RECOMMENDED_VISION}
          hint="L'OCR a besoin d'un modèle multimodal (vision). Liste filtrée sur les modèles compatibles image."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Date *</Label>
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
          {fe.date ? <p className="mt-1 text-xs text-destructive">{fe.date}</p> : null}
        </div>

        <div>
          <Label htmlFor="montant">Montant € *</Label>
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
          {fe.montant ? <p className="mt-1 text-xs text-destructive">{fe.montant}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="categorie">Catégorie *</Label>
          <Select
            name="categorie"
            value={categorie}
            onValueChange={(v) => setCategorie((v ?? "autre") as CategorieDepense)}
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
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex : 10 kg de fleurs d'hibiscus chez Maraicher Réunion"
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={pending}
          />
          {fe.description ? (
            <p className="mt-1 text-xs text-destructive">{fe.description}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="justificatif">Justificatif (photo ou PDF, max 5 Mo)</Label>
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
