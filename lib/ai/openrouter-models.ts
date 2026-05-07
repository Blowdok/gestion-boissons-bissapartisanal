import "server-only";

/**
 * Recuperation dynamique de la liste des modeles OpenRouter avec leurs
 * metadonnees (prix, contexte, capacites). Cache memoire 1h pour eviter
 * de spammer l'API a chaque ouverture du selecteur.
 *
 * Doc : https://openrouter.ai/docs/api-reference/list-available-models
 */

export type OpenRouterModelRaw = {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length: number;
  architecture: {
    modality?: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer?: string;
  };
  pricing: {
    prompt: string; // USD par token (string pour eviter pertes de precision)
    completion: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
};

export type OpenRouterModel = {
  id: string;
  name: string;
  context_length: number;
  prompt_price_per_million: number;
  completion_price_per_million: number;
  input_modalities: string[];
  supports_tools: boolean;
  supports_images: boolean;
  description: string | null;
};

const TTL_MS = 60 * 60 * 1000; // 1h
let cache: { data: OpenRouterModel[]; expiresAt: number } | null = null;

function normalize(raw: OpenRouterModelRaw): OpenRouterModel {
  const promptUsd = Number(raw.pricing.prompt) || 0;
  const completionUsd = Number(raw.pricing.completion) || 0;
  return {
    id: raw.id,
    name: raw.name,
    context_length: raw.context_length ?? 0,
    prompt_price_per_million: promptUsd * 1_000_000,
    completion_price_per_million: completionUsd * 1_000_000,
    input_modalities: raw.architecture?.input_modalities ?? [],
    supports_tools: raw.supported_parameters?.includes("tools") ?? false,
    supports_images:
      raw.architecture?.input_modalities?.includes("image") ?? false,
    description: raw.description?.slice(0, 240) ?? null,
  };
}

export async function listOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      // Next.js cache fetch en plus du cache memoire (defense en profondeur)
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      // Si on a une copie en cache (meme expiree), on la sert plutot que crasher
      if (cache) return cache.data;
      throw new Error(`OpenRouter models HTTP ${res.status}`);
    }
    const json = (await res.json()) as { data: OpenRouterModelRaw[] };
    const data = (json.data ?? []).map(normalize);
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch (e) {
    if (cache) return cache.data;
    throw e;
  }
}

export type Capability = "tools" | "vision";

export function filterByCapability(
  models: OpenRouterModel[],
  capability: Capability,
): OpenRouterModel[] {
  if (capability === "tools") return models.filter((m) => m.supports_tools);
  return models.filter((m) => m.supports_images);
}
