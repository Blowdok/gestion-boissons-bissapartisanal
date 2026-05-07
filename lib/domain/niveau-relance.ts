/**
 * Constantes et helpers liés au niveau de relance d'impayé.
 *
 * Ce fichier ne contient AUCUN code serveur (pas de "server-only", pas
 * d'appel à OpenRouter / Supabase) afin d'être importable depuis les
 * composants client (`relance-modal.tsx`) sans casser le build.
 *
 * La logique de génération (qui appelle l'IA) vit dans `lib/ai/relance.ts`
 * qui est strictement server-only.
 */

export const NIVEAUX_RELANCE = [
  "courtoise",
  "ferme",
  "mise_en_demeure",
] as const;

export type NiveauRelance = (typeof NIVEAUX_RELANCE)[number];

export const NIVEAU_LABELS: Record<NiveauRelance, string> = {
  courtoise: "Courtoise",
  ferme: "Ferme",
  mise_en_demeure: "Mise en demeure",
};

export const NIVEAU_DESCRIPTIONS: Record<NiveauRelance, string> = {
  courtoise:
    "Simple rappel amical, ton chaleureux. Pour une facture peu en retard.",
  ferme:
    "Rappel plus pressant qui mentionne explicitement que la facture est en retard. Évoque les suites possibles sans menacer.",
  mise_en_demeure:
    "Préalable à une procédure contentieuse. Mention « mise en demeure », rappel des intérêts de retard légaux, délai de 8 jours, ton ferme et formel.",
};

/**
 * Suggère un niveau par défaut en fonction de l'ancienneté de la facture.
 * Le Patron peut toujours surcharger via le sélecteur dans la modale.
 */
export function niveauParAnciennete(jours: number): NiveauRelance {
  if (jours < 30) return "courtoise";
  if (jours <= 60) return "ferme";
  return "mise_en_demeure";
}
