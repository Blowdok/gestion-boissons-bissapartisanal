import "server-only";
import { getResend, RESEND_FROM } from "./resend";
import { ENTREPRISE } from "@/lib/config/entreprise";

/**
 * Envoi d'un email de relance via Resend.
 *
 * Le contenu HTML/texte vient de l'IA (lib/ai/relance.ts), souvent édité
 * manuellement par le Patron avant envoi. Cette fonction se contente
 * d'enrober le HTML dans un wrapper CSS-inline minimal et d'appeler Resend.
 */

export type SendRelanceInput = {
  destinataire: string; // email du client
  sujet: string;
  contenuHtml: string; // corps de l'email en HTML simple (sans <html>/<body>)
  contenuTexte: string; // version texte brut équivalente
};

export type SendRelanceResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      reason: "no_api_key" | "send_failed";
      detail?: string;
    };

export async function sendRelanceByEmail(
  input: SendRelanceInput,
): Promise<SendRelanceResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, reason: "no_api_key" };
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; max-width: 580px; margin: 0 auto; padding: 24px;">
      ${input.contenuHtml}
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
      <p style="font-size: 12px; color: #64748b;">
        ${ENTREPRISE.raison_sociale} · ${ENTREPRISE.adresse}, ${ENTREPRISE.code_postal} ${ENTREPRISE.ville}<br/>
        SIRET ${ENTREPRISE.siret} · ${ENTREPRISE.email} · ${ENTREPRISE.telephone_mobile}
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [input.destinataire],
      replyTo: ENTREPRISE.email,
      subject: input.sujet,
      html,
      text: input.contenuTexte,
    });
    if (error) {
      return { ok: false, reason: "send_failed", detail: error.message };
    }
    return { ok: true, messageId: data?.id ?? "" };
  } catch (e) {
    return {
      ok: false,
      reason: "send_failed",
      detail: e instanceof Error ? e.message : "Erreur inconnue",
    };
  }
}
