"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { checkAiActive } from "@/lib/ai/guards";
import { genererRelance, type RelanceContenu } from "@/lib/ai/relance";
import {
  niveauParAnciennete,
  type NiveauRelance,
} from "@/lib/domain/niveau-relance";
import { sendRelanceByEmail } from "@/lib/email/send-relance";

const NIVEAUX = ["courtoise", "ferme", "mise_en_demeure"] as const;
function isNiveau(v: unknown): v is NiveauRelance {
  return typeof v === "string" && (NIVEAUX as readonly string[]).includes(v);
}

const SEUIL_RELANCE_RECENTE_JOURS = 7;

// =============================================================================
// 1. Génération du brouillon (IA) — pas d'envoi, juste retourner le texte
// =============================================================================
export type GenererBrouillonResult =
  | { ok: true; niveau: NiveauRelance; contenu: RelanceContenu }
  | {
      ok: false;
      reason:
        | "no_ai_key"
        | "no_email"
        | "facture_payee"
        | "facture_annulee"
        | "relance_recente"
        | "erreur"
        | "non_autorise";
      message: string;
    };

export async function genererBrouillonRelance(
  factureId: string,
  niveauOverride?: string,
  modelId?: string,
): Promise<GenererBrouillonResult> {
  const { supabase } = await requireRole("patron", "adjoint");

  const inactive = checkAiActive();
  if (inactive) {
    return { ok: false, reason: "no_ai_key", message: inactive.message };
  }

  // Récupère la facture + le client (RLS garantit que l'utilisateur a accès)
  const { data: facture, error: errF } = await supabase
    .from("factures_avec_solde")
    .select(
      "id, numero, date_emission, montant_ht, montant_encaisse, solde, anciennete_jours, statut_paiement, est_annulee, client_id",
    )
    .eq("id", factureId)
    .maybeSingle();
  if (errF) return { ok: false, reason: "erreur", message: errF.message };
  if (!facture) {
    return { ok: false, reason: "erreur", message: "Facture introuvable." };
  }
  if (facture.est_annulee) {
    return {
      ok: false,
      reason: "facture_annulee",
      message: "Cette facture a été annulée — aucune relance ne peut être envoyée.",
    };
  }
  if (Number(facture.solde) <= 0.01) {
    return {
      ok: false,
      reason: "facture_payee",
      message: "Cette facture est déjà entièrement payée.",
    };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("raison_sociale, contact, email, conditions_paiement")
    .eq("id", facture.client_id)
    .maybeSingle();
  if (!client?.email) {
    return {
      ok: false,
      reason: "no_email",
      message:
        "Le client n'a pas d'adresse email enregistrée. Ajoutez-en une pour pouvoir envoyer une relance.",
    };
  }

  // Garde-fou : pas de relance si une autre est partie il y a moins de 7 jours
  const seuilStr = new Date(
    Date.now() - SEUIL_RELANCE_RECENTE_JOURS * 86400000,
  ).toISOString();
  const { data: derniere } = await supabase
    .from("relances_facture")
    .select("envoye_le, niveau")
    .eq("facture_id", factureId)
    .gte("envoye_le", seuilStr)
    .order("envoye_le", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (derniere) {
    return {
      ok: false,
      reason: "relance_recente",
      message: `Une relance ${derniere.niveau} a déjà été envoyée le ${new Date(
        derniere.envoye_le,
      ).toLocaleDateString("fr-FR")}. Attendez au moins ${SEUIL_RELANCE_RECENTE_JOURS} jours avant la suivante.`,
    };
  }

  const niveau: NiveauRelance = isNiveau(niveauOverride)
    ? niveauOverride
    : niveauParAnciennete(Number(facture.anciennete_jours ?? 0));

  try {
    const contenu = await genererRelance(
      {
        facture: {
          numero: facture.numero,
          date_emission: facture.date_emission,
          montant_ht: Number(facture.montant_ht),
          montant_encaisse: Number(facture.montant_encaisse ?? 0),
          solde: Number(facture.solde ?? 0),
          anciennete_jours: Number(facture.anciennete_jours ?? 0),
        },
        client: {
          raison_sociale: client.raison_sociale,
          contact: client.contact,
          conditions_paiement: client.conditions_paiement,
        },
        niveau,
      },
      modelId,
    );
    return { ok: true, niveau, contenu };
  } catch (e) {
    return {
      ok: false,
      reason: "erreur",
      message:
        "Échec de génération : " +
        (e instanceof Error ? e.message : "erreur inconnue"),
    };
  }
}

// =============================================================================
// 2. Envoi effectif de la relance (après édition éventuelle par le Patron)
// =============================================================================
export type EnvoyerRelanceResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      reason:
        | "no_email"
        | "facture_payee"
        | "facture_annulee"
        | "send_failed"
        | "no_api_key"
        | "erreur"
        | "relance_recente";
      message: string;
    };

export async function envoyerRelance(input: {
  factureId: string;
  niveau: string;
  sujet: string;
  contenuHtml: string;
  contenuTexte: string;
}): Promise<EnvoyerRelanceResult> {
  const { supabase, user } = await requireRole("patron", "adjoint");

  if (!isNiveau(input.niveau)) {
    return { ok: false, reason: "erreur", message: "Niveau de relance invalide." };
  }
  if (!input.sujet.trim() || !input.contenuHtml.trim() || !input.contenuTexte.trim()) {
    return {
      ok: false,
      reason: "erreur",
      message: "Sujet et contenu de la relance sont requis.",
    };
  }

  const { data: facture } = await supabase
    .from("factures_avec_solde")
    .select("id, solde, client_id, est_annulee")
    .eq("id", input.factureId)
    .maybeSingle();
  if (!facture) {
    return { ok: false, reason: "erreur", message: "Facture introuvable." };
  }
  if (facture.est_annulee) {
    return {
      ok: false,
      reason: "facture_annulee",
      message: "Cette facture a été annulée — aucune relance ne peut être envoyée.",
    };
  }
  if (Number(facture.solde) <= 0.01) {
    return {
      ok: false,
      reason: "facture_payee",
      message: "Cette facture est déjà payée.",
    };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("email")
    .eq("id", facture.client_id)
    .maybeSingle();
  if (!client?.email) {
    return {
      ok: false,
      reason: "no_email",
      message: "Pas d'email client renseigné.",
    };
  }

  // Re-vérifie le garde-fou des 7 jours côté serveur (au cas où l'utilisateur
  // a gardé la modale ouverte longtemps et qu'une autre relance a été envoyée
  // entre temps)
  const seuilStr = new Date(
    Date.now() - SEUIL_RELANCE_RECENTE_JOURS * 86400000,
  ).toISOString();
  const { data: derniere } = await supabase
    .from("relances_facture")
    .select("envoye_le")
    .eq("facture_id", input.factureId)
    .gte("envoye_le", seuilStr)
    .limit(1)
    .maybeSingle();
  if (derniere) {
    return {
      ok: false,
      reason: "relance_recente",
      message: `Une relance a déjà été envoyée il y a moins de ${SEUIL_RELANCE_RECENTE_JOURS} jours.`,
    };
  }

  // Envoi
  const result = await sendRelanceByEmail({
    destinataire: client.email,
    sujet: input.sujet,
    contenuHtml: input.contenuHtml,
    contenuTexte: input.contenuTexte,
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      message:
        result.reason === "no_api_key"
          ? "Resend n'est pas configuré (RESEND_API_KEY absente)."
          : "Échec d'envoi : " + (result.detail ?? "raison inconnue"),
    };
  }

  // Trace en base (audit trail immuable)
  const { error: errInsert } = await supabase.from("relances_facture").insert({
    facture_id: input.factureId,
    niveau: input.niveau,
    sujet: input.sujet,
    contenu_html: input.contenuHtml,
    contenu_texte: input.contenuTexte,
    envoye_a: client.email,
    envoye_par: user.id,
    message_id: result.messageId || null,
  });
  if (errInsert) {
    // L'email est parti mais la trace n'a pas été enregistrée — on log
    // l'incident sans bloquer le retour de succès (garbage = données
    // partielles serait pire que pas de trace).
    console.error(
      "Relance envoyée mais échec d'enregistrement en BDD :",
      errInsert.message,
    );
  }

  revalidatePath(`/factures/${input.factureId}`);
  return { ok: true, messageId: result.messageId };
}
