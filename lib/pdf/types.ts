/**
 * Types partages entre les templates PDF (Facture, BL).
 */

export type PdfClient = {
  raison_sociale: string;
  contact?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  siret?: string | null;
  email?: string | null;
  telephone?: string | null;
  conditions_paiement?: string | null;
};

export type PdfLigne = {
  produit_nom: string;
  format?: string | null;
  /** Poids unitaire en grammes (utilisé sur le BL ; null = produit historique) */
  poids_grammes?: number | null;
  qte: number;
  prix_unitaire_ht: number;
};

export type PdfFactureData = {
  numero: string;
  date_emission: string;
  date_livraison?: string | null;
  client: PdfClient;
  lignes: PdfLigne[];
  montant_ht: number;
  // Etat des reglements (issu de la vue factures_avec_solde)
  montant_encaisse: number;
  montant_a_encaisser: number;
  solde: number;
  statut_paiement: "paye" | "partiel" | "impaye";
};

export type PdfBonLivraisonData = {
  livraison_id: string;
  numero?: string | null;
  date_prevue: string;
  date_livraison?: string | null;
  client: PdfClient;
  lignes: PdfLigne[];
};
