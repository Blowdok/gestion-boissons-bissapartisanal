import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { getResend, RESEND_FROM, RESEND_REPLY_TO } from "./resend";
import { FacturePDF } from "@/lib/pdf/facture";
import { ENTREPRISE } from "@/lib/config/entreprise";
import { formatEUR } from "@/lib/utils/format";
import type { PdfFactureData } from "@/lib/pdf/types";

export type SendFactureResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: "no_api_key" | "no_email" | "send_failed"; detail?: string };

export async function sendFactureByEmail(
  data: PdfFactureData,
): Promise<SendFactureResult> {
  // 1. Verifier que le client a un email
  if (!data.client.email || !data.client.email.includes("@")) {
    return { ok: false, reason: "no_email" };
  }

  // 2. Verifier que Resend est configure
  const resend = getResend();
  if (!resend) {
    return { ok: false, reason: "no_api_key" };
  }

  // 3. Generer le PDF en buffer
  const pdfBuffer = await renderToBuffer(<FacturePDF data={data} />);

  // 4. Construire le corps de l'email (HTML + texte brut pour clients qui n'affichent pas le HTML)
  const subject = `Facture ${data.numero} — ${ENTREPRISE.raison_sociale}`;
  const greeting = data.client.contact
    ? `Bonjour ${data.client.contact},`
    : `Bonjour,`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; max-width: 580px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 16px;">${greeting}</p>
      <p>Vous trouverez ci-joint votre facture <strong>${data.numero}</strong>
        d'un montant de <strong>${formatEUR(data.montant_du ?? data.montant_ht)}</strong>${
          (data.montant_consigne ?? 0) > 0
            ? ` (incluant un crédit consigne de ${formatEUR(data.montant_consigne!)})`
            : ""
        }.</p>
      <p>${data.client.conditions_paiement ?? ENTREPRISE.conditions_paiement_defaut}</p>
      <p>Merci pour votre confiance.</p>
      <p style="margin-top: 24px;">Cordialement,<br/><strong>${ENTREPRISE.gerant}</strong><br/>
        <span style="color: #64748b;">${ENTREPRISE.raison_sociale}</span></p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
      <p style="font-size: 12px; color: #64748b;">
        ${ENTREPRISE.raison_sociale} · ${ENTREPRISE.adresse}, ${ENTREPRISE.code_postal} ${ENTREPRISE.ville}<br/>
        SIRET ${ENTREPRISE.siret} · ${ENTREPRISE.email} · ${ENTREPRISE.telephone_mobile}
      </p>
    </div>
  `;
  const text = `${greeting}

Vous trouverez ci-joint votre facture ${data.numero} d'un montant de ${formatEUR(data.montant_du ?? data.montant_ht)}${
    (data.montant_consigne ?? 0) > 0
      ? ` (incluant un crédit consigne de ${formatEUR(data.montant_consigne!)})`
      : ""
  }.

${data.client.conditions_paiement ?? ENTREPRISE.conditions_paiement_defaut}

Merci pour votre confiance.

Cordialement,
${ENTREPRISE.gerant}
${ENTREPRISE.raison_sociale}

---
${ENTREPRISE.raison_sociale} · ${ENTREPRISE.adresse}, ${ENTREPRISE.code_postal} ${ENTREPRISE.ville}
SIRET ${ENTREPRISE.siret} · ${ENTREPRISE.email} · ${ENTREPRISE.telephone_mobile}
`;

  // 5. Envoyer via Resend
  try {
    const { data: response, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [data.client.email],
      replyTo: RESEND_REPLY_TO ?? ENTREPRISE.email,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `${data.numero}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return { ok: false, reason: "send_failed", detail: error.message };
    }
    return { ok: true, messageId: response?.id ?? "" };
  } catch (e) {
    return {
      ok: false,
      reason: "send_failed",
      detail: e instanceof Error ? e.message : "Erreur inconnue",
    };
  }
}
