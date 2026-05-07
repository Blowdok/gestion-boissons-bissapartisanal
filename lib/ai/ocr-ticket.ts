import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { getOpenRouter } from "./client";
import { MODELS } from "./models";
import { CATEGORIES_DEPENSE } from "@/app/(app)/finance/depenses/schemas";

/**
 * Extraction des donnees structurees d'un ticket de caisse via vision IA
 * (Gemini 2.5 Flash via OpenRouter).
 *
 * - Tous les champs sont nullable : si l'info est illisible, retourne null
 * - La categorie est contrainte a la liste fermee CATEGORIES_DEPENSE
 * - La date doit etre au format YYYY-MM-DD (jamais une string libre)
 * - Le montant est en euros (number, pas string)
 */
export const ticketSchema = z.object({
  montant: z
    .number()
    .nullable()
    .describe("Montant total TTC du ticket en euros (ex: 45.80)"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD")
    .nullable()
    .describe("Date d'achat au format YYYY-MM-DD"),
  categorie: z
    .enum(CATEGORIES_DEPENSE)
    .nullable()
    .describe("Categorie de depense la plus probable parmi la liste"),
  description: z
    .string()
    .max(200)
    .nullable()
    .describe(
      "Description courte (commerce + nature des achats, ex: 'Carrefour - matieres premieres bissap')",
    ),
});

export type TicketExtraction = z.infer<typeof ticketSchema>;

const SYSTEM_PROMPT = `Tu es un assistant qui extrait les informations d'un ticket de caisse francais pour une entreprise artisanale de production de boissons (Bissapa - hibiscus, gingembre, etc.) basee a La Reunion.

Extrais avec precision :
- montant : le TOTAL TTC du ticket (pas un sous-total). En euros, en number.
- date : la date d'achat ou d'emission du ticket, au format YYYY-MM-DD strict.
- categorie : choisis la plus probable parmi les 11 categories disponibles. Definition Bissapa :
  * matieres_premieres : ingrédients de production (sucre, fleurs d'hibiscus, fruits ananas/gingembre/citron/menthe, arômes), gaz et eau de production, ainsi que tout ce qui sert directement à fabriquer ou conditionner : bouteilles, capsules, bouchons, cartons, étiquettes, films plastiques, affiches, et même les machines/outillage de production
  * salaire_employe : salaires des employes, charges sociales du personnel
  * electricite : facture EDF, électricité du local (le gaz/eau de production restent en matieres_premieres)
  * cotisations_etat : URSSAF, impôts, CFE, taxes
  * loyer : loyer du local
  * logiciel_facturation : abonnements logiciels (compta, facturation, SaaS pro)
  * telephone : forfait pro, internet
  * transport : carburant, péage, réparation du véhicule (l'assurance véhicule est dans la catégorie assurance)
  * assurance : RC professionnelle, assurance véhicule, multirisque local
  * marketing_communication : pubs, salons, flyers, communication, cadeaux clients
  * autres : tout ce qui ne rentre dans aucune catégorie ci-dessus (frais bancaires, divers, imprévus)
- description : courte (max 200 caracteres). Format ideal : "Nom commerce - nature de l'achat"

Si une info est illisible ou absente, retourne null pour ce champ. Ne jamais inventer.`;

export async function extraireDonneesTicket(
  imageBuffer: Buffer,
  modelId?: string,
): Promise<TicketExtraction> {
  const openrouter = getOpenRouter();
  if (!openrouter) {
    throw new Error("OpenRouter non configure (OPENROUTER_API_KEY absente).");
  }

  // Validation legere du format du modele pour eviter qu'un body
  // malicieux passe une chaine arbitraire ; fallback sur le defaut.
  const safeModel =
    modelId && /^[\w.-]+\/[\w.@:-]+$/.test(modelId) ? modelId : MODELS.vision;

  const { object } = await generateObject({
    model: openrouter(safeModel),
    schema: ticketSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyse ce ticket de caisse et retourne les informations au format demande.",
          },
          {
            type: "image",
            image: imageBuffer,
          },
        ],
      },
    ],
  });

  return object;
}
