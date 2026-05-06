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
 *   dans Resend (ex : 'facture@lebissapartisanal.com')
 */
export const RESEND_FROM =
  process.env.RESEND_FROM ?? "Le Bissap Artisanal <onboarding@resend.dev>";
