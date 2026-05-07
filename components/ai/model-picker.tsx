"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OpenRouterModel } from "@/lib/ai/openrouter-models";

type Capability = "tools" | "vision";

type Props = {
  /** Modele actuellement selectionne (id OpenRouter, ex: "anthropic/claude-sonnet-4.6") */
  value: string;
  /** Callback quand l'utilisateur selectionne un modele */
  onChange: (modelId: string) => void;
  /** Filtre les modeles selon la capacite requise */
  capability?: Capability;
  /** Texte d'introduction au-dessus de la liste (optionnel) */
  hint?: string;
  /** Disable le bouton (ex: pendant un streaming) */
  disabled?: boolean;
  /** Modeles a mettre en avant en haut de la liste (les "recommandes") */
  recommended?: string[];
};

function formatPrice(usdPerMillion: number): string {
  if (!usdPerMillion) return "Gratuit";
  if (usdPerMillion < 0.01) return `$${usdPerMillion.toFixed(4)}`;
  if (usdPerMillion < 1) return `$${usdPerMillion.toFixed(3)}`;
  return `$${usdPerMillion.toFixed(2)}`;
}

function formatContext(tokens: number): string {
  if (!tokens) return "—";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return tokens.toString();
}

export function ModelPicker({
  value,
  onChange,
  capability,
  hint,
  disabled,
  recommended = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Charger les modeles uniquement la premiere fois que le dialog s'ouvre
  // (declenche par onOpenChange plutot qu'un useEffect, pour rester en
  // dehors du rendu et eviter les set-state-in-effect).
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next || models.length > 0 || loading) return;
      setLoading(true);
      setError(null);
      const url = capability
        ? `/api/ai/models?capability=${capability}`
        : "/api/ai/models";
      fetch(url)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<{ models: OpenRouterModel[] }>;
        })
        .then((data) => setModels(data.models))
        .catch((e: Error) =>
          setError(e.message ?? "Echec du chargement des modeles"),
        )
        .finally(() => setLoading(false));
    },
    [capability, models.length, loading],
  );

  const current = useMemo(
    () => models.find((m) => m.id === value),
    [models, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q),
    );
  }, [models, search]);

  const { recommendedModels, otherModels } = useMemo(() => {
    const rec: OpenRouterModel[] = [];
    const other: OpenRouterModel[] = [];
    for (const m of filtered) {
      if (recommended.includes(m.id)) rec.push(m);
      else other.push(m);
    }
    // Ordre des recommandes = ordre dans le tableau `recommended`
    rec.sort(
      (a, b) => recommended.indexOf(a.id) - recommended.indexOf(b.id),
    );
    return { recommendedModels: rec, otherModels: other };
  }, [filtered, recommended]);

  const handlePick = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  // Affiche le nom complet si on l'a (modeles charges), sinon le slug
  // (partie apres le /). Pas de libelle au-dessus, on veut un trigger
  // compact qui montre juste le modele actif.
  const displayName = current?.name ?? value.split("/").pop() ?? value;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="justify-between gap-2 text-left font-normal"
          />
        }
      >
        <Sparkles className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate text-sm font-medium">{displayName}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </DialogTrigger>

      <DialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Choisir un modèle IA</DialogTitle>
          <DialogDescription>
            {hint ??
              "Liste récupérée en direct depuis OpenRouter. Prix indiqués pour 1 million de tokens."}
          </DialogDescription>
          <div className="relative mt-2">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              type="text"
              placeholder="Rechercher (claude, gemini, gratuit, vision…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement de la liste…
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">
              Erreur : {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aucun modèle ne correspond à « {search} ».
            </div>
          ) : (
            <div className="space-y-1">
              {recommendedModels.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="size-3" />
                    Recommandés pour cet usage
                  </div>
                  {recommendedModels.map((m) => (
                    <ModelCard
                      key={m.id}
                      model={m}
                      selected={m.id === value}
                      onPick={handlePick}
                    />
                  ))}
                  {otherModels.length > 0 ? (
                    <div className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                      Autres modèles ({otherModels.length})
                    </div>
                  ) : null}
                </>
              ) : null}
              {otherModels.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  selected={m.id === value}
                  onPick={handlePick}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelCard({
  model,
  selected,
  onPick,
}: {
  model: OpenRouterModel;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  const gratuit =
    model.prompt_price_per_million === 0 &&
    model.completion_price_per_million === 0;

  return (
    <button
      type="button"
      onClick={() => onPick(model.id)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
        selected && "border-primary bg-primary/5",
      )}
    >
      {/* Ligne 1 : nom + badges capacite */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {selected ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : null}
            <span className="truncate text-sm font-medium">{model.name}</span>
          </div>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {model.id}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {model.supports_tools ? (
            <Badge variant="secondary" className="text-[10px]">
              tools
            </Badge>
          ) : null}
          {model.supports_images ? (
            <Badge variant="secondary" className="text-[10px]">
              vision
            </Badge>
          ) : null}
          {gratuit ? (
            <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
              gratuit
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Ligne 2 : prix + contexte sur 3 colonnes alignees */}
      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Input
          </span>
          <span className="font-medium tabular-nums">
            {formatPrice(model.prompt_price_per_million)}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              /1M
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Output
          </span>
          <span className="font-medium tabular-nums">
            {formatPrice(model.completion_price_per_million)}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              /1M
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Contexte
          </span>
          <span className="font-medium tabular-nums">
            {formatContext(model.context_length)}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              tokens
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}
