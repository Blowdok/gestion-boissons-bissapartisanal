import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { getOpenRouter } from "./client";
import { MODELS } from "./models";
import { ENTREPRISE } from "@/lib/config/entreprise";

/**
 * Génération d'un email de relance pour une facture impayée.
 *
 * Le ton est calibré selon le niveau (courtoise / ferme / mise_en_demeure)
 * que le Patron a choisi (par défaut : déduit de l'ancienneté).
 *
 * Modèle utilisé : MODELS.redaction (Claude Haiku 4.5) — rapide, qualité
 * suffisante pour de l'email court, ~0.001 € l'envoi.
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

// =============================================================================
// Schéma de sortie de l'IA
// =============================================================================
export const relanceSchema = z.object({
  sujet: z
    .string()
    .min(5)
    .max(150)
    .describe(
      "Objet de l'email, court et clair (ex: 'Relance facture FAC-2026-00012').",
    ),
  texte_html: z
    .string()
    .min(50)
    .describe(
      "Corps de l'email en HTML simple : balises <p>, <strong>, <br/>, sans CSS, sans <html>/<body>. Le wrapping <div> sera ajouté côté envoi.",
    ),
  texte_brut: z
    .string()
    .min(50)
    .describe(
      "Version texte brut équivalente au HTML, retours ligne respectés, sans balises.",
    ),
});
export type RelanceContenu = z.infer<typeof relanceSchema>;

// =============================================================================
// Données contextuelles de la facture (injectées dans le prompt)
// =============================================================================
export type RelanceContexte = {
  facture: {
    numero: string;
    date_emission: string; // YYYY-MM-DD
    montant_ht: number;
    montant_encaisse: number;
    solde: number;
    anciennete_jours: number;
  };
  client: {
    raison_sociale: string;
    contact: string | null;
    conditions_paiement: string | null;
  };
  niveau: NiveauRelance;
};

function instructionsParNiveau(n: NiveauRelance): string {
  switch (n) {
    case "courtoise":
      return `TON COURTOIS — Cordial, chaleureux. Suppose un simple oubli. Phrases comme "Sauf erreur de notre part" ou "Peut-être un simple oubli". Pas de menace ni de mention d'intérêts de retard. Court (4-5 lignes).`;
    case "ferme":
      return `TON FERME — Reconnaît que la facture est en retard significatif. Demande un règlement sous 15 jours. Évoque que sans réponse une mise en demeure pourra être adressée. Pas encore d'intérêts de retard explicités. Concis (5-7 lignes).`;
    case "mise_en_demeure":
      return `TON MISE EN DEMEURE — Mentionne EXPLICITEMENT "Par la présente, nous vous mettons en demeure de régler". Délai impératif 8 jours calendaires. Mention des intérêts de retard légaux (3x taux directeur BCE + indemnité forfaitaire 40 € art. L.441-10 du Code de commerce). Ton ferme et formel. Précise que sans règlement, l'affaire sera transmise à notre conseil pour recouvrement contentieux. Vouvoiement strict.`;
  }
}

// =============================================================================
// Génération
// =============================================================================
export async function genererRelance(
  ctx: RelanceContexte,
  modelId?: string,
): Promise<RelanceContenu> {
  const openrouter = getOpenRouter();
  if (!openrouter) {
    throw new Error("OpenRouter non configuré (OPENROUTER_API_KEY absente).");
  }

  // Validation légère du format du modèle (provider/model)
  const safeModel =
    modelId && /^[\w.-]+\/[\w.@:-]+$/.test(modelId)
      ? modelId
      : MODELS.redaction;

  const system = `Tu rédiges des emails de relance d'impayés pour une entreprise française artisanale (production de boissons hibiscus).

Règles strictes :
- Toujours en français, vouvoiement strict
- Pas de mention "Bonjour [Prénom Nom]," : utilise le nom du contact si fourni, sinon la raison sociale
- Pas de markdown dans le HTML (que des balises HTML simples)
- Ne JAMAIS inventer un montant, une date, un délai déjà payé : réutilise ceux fournis
- Toujours rappeler le numéro de facture, la date d'émission, le montant total et le solde restant dû
- Toujours rappeler le RIB de l'entreprise pour faciliter le paiement
- Toujours signer "${ENTREPRISE.gerant}" pour le compte de "${ENTREPRISE.raison_sociale}"
- Le HTML ne doit PAS contenir <html>, <head>, <body> — juste le contenu (paragraphes <p>, gras <strong>, retours <br/>)`;

  const prompt = `Rédige un email de relance pour la facture impayée suivante :

CONTEXTE FACTURE :
- Numéro : ${ctx.facture.numero}
- Date d'émission : ${ctx.facture.date_emission}
- Montant total HT : ${ctx.facture.montant_ht.toFixed(2)} €
- Déjà encaissé : ${ctx.facture.montant_encaisse.toFixed(2)} €
- Solde restant dû : ${ctx.facture.solde.toFixed(2)} €
- Ancienneté : ${ctx.facture.anciennete_jours} jour(s)
- Conditions de paiement applicables : ${ctx.client.conditions_paiement ?? ENTREPRISE.conditions_paiement_defaut}

CLIENT :
- Raison sociale : ${ctx.client.raison_sociale}
- Contact : ${ctx.client.contact ?? "(non renseigné, salutation générique)"}

ENTREPRISE EXPÉDITRICE :
- Raison sociale : ${ENTREPRISE.raison_sociale}
- Gérant : ${ENTREPRISE.gerant}
- Adresse : ${ENTREPRISE.adresse}, ${ENTREPRISE.code_postal} ${ENTREPRISE.ville}
- SIRET : ${ENTREPRISE.siret}
- Email : ${ENTREPRISE.email}
- IBAN : ${ENTREPRISE.iban}
- BIC : ${ENTREPRISE.bic}

NIVEAU DE RELANCE DEMANDÉ : ${ctx.niveau.toUpperCase()}
${instructionsParNiveau(ctx.niveau)}

Retourne 3 champs : sujet (objet email), texte_html (corps HTML simple), texte_brut (version sans balises pour clients qui n'affichent pas le HTML).`;

  const { object } = await generateObject({
    model: openrouter(safeModel),
    schema: relanceSchema,
    system,
    prompt,
  });

  return object;
}
