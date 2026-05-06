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
};

export type PdfBonLivraisonData = {
  livraison_id: string;
  numero?: string | null;
  date_prevue: string;
  date_livraison?: string | null;
  client: PdfClient;
  lignes: PdfLigne[];
};
