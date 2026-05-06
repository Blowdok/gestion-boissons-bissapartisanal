import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Client OpenRouter unifie pour les features IA de la V2.
 *
 * - Provider unique pour 100+ modeles (Gemini, Claude, GPT, Llama...)
 * - Fallback automatique entre providers si l'un est indispo
 * - Facturation unifiee chez Bissapa
 *
 * Si la cle OPENROUTER_API_KEY est absente, getOpenRouter() retourne null
 * et les features IA degradent gracieusement (UI affiche un message
 * d'aide au lieu de planter). Cf lib/ai/guards.ts.
 */

const apiKey = process.env.OPENROUTER_API_KEY;

let cachedProvider: ReturnType<typeof createOpenRouter> | null = null;

export function getOpenRouter() {
  if (!apiKey) return null;
  if (!cachedProvider) {
    cachedProvider = createOpenRouter({
      apiKey,
      // Headers optionnels affiches dans le dashboard OpenRouter
      headers: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Le Bissap Artisanal",
      },
    });
  }
  return cachedProvider;
}

export function isAiActive(): boolean {
  return Boolean(apiKey);
}
