import "server-only";
import { Resend } from "resend";

/**
 * Client Resend pour envoyer les emails transactionnels (factures).
 *
 * Si RESEND_API_KEY n'est pas configuree, on retourne null et l'app continue
 * de fonctionner — l'envoi d'email est simplement skip avec un message.
 *
 * Pour configurer : creer un compte sur https://resend.com (gratuit jusqu'a
 * 100 emails/jour), recuperer une API key et l'ajouter dans .env.local :
 *   RESEND_API_KEY=re_xxxxxxxxxxxxx
 */
export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Adresse expéditeur des emails transactionnels.
 *
 * - Par defaut : 'onboarding@resend.dev' (domaine de test Resend, fonctionne
 *   sans configuration DNS — utile pour demarrer)
 * - En prod : surcharger via RESEND_FROM avec une adresse d'un domaine verifie
 *   dans Resend (ex : 'Le Bissap Artisanal <facture@societe.lebissapartisanal.click>')
 */
export const RESEND_FROM =
  process.env.RESEND_FROM ?? "Le Bissap Artisanal <onboarding@resend.dev>";

/**
 * Adresse de reponse (Reply-To) des emails transactionnels.
 *
 * Permet de decorreler le domaine technique d'envoi (sous-domaine verifie chez
 * Resend, ex: societe.lebissapartisanal.click) de l'adresse de contact lisible
 * sur le domaine racine. Quand un client clique "Repondre", la reponse part
 * vers cette adresse — qui peut etre rediree via ImprovMX ou un service
 * equivalent vers une vraie boite mail (ex: Gmail).
 *
 * - Si non defini : fallback sur RESEND_FROM (comportement par defaut Resend).
 * - En prod : RESEND_REPLY_TO=facture@lebissapartisanal.click
 */
export const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO;
