import "server-only";
import { isAiActive } from "./client";

/**
 * Result type unifie pour les server actions IA en cas de probleme
 * d'infrastructure (cle absente, modele indispo, etc.). Les features
 * doivent gerer ces cas pour ne jamais planter une page Patron.
 */
export type AiUnavailable =
  | { ok: false; reason: "no_api_key"; message: string }
  | { ok: false; reason: "ai_error"; message: string };

/**
 * Verifie que l'IA est configuree. Retourne null si OK, sinon un objet
 * d'erreur a renvoyer tel quel au formulaire client.
 */
export function checkAiActive(): AiUnavailable | null {
  if (!isAiActive()) {
    return {
      ok: false,
      reason: "no_api_key",
      message:
        "La fonctionnalité IA n'est pas activée. " +
        "Contacter l'administrateur pour configurer OPENROUTER_API_KEY.",
    };
  }
  return null;
}
