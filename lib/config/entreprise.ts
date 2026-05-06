/**
 * Configuration de l'entreprise emettrice (Bissapa).
 *
 * Ces informations apparaissent sur les bons de livraison et les factures
 * generes en PDF. Modifier ici pour mettre a jour partout.
 *
 * Pour les valeurs sensibles (IBAN, SIRET reel), utiliser les variables
 * d'environnement (NEXT_PUBLIC_ENTREPRISE_*) qui prennent le pas sur
 * les valeurs par defaut ci-dessous.
 */
export const ENTREPRISE = {
  raison_sociale:
    process.env.NEXT_PUBLIC_ENTREPRISE_NOM ?? "Le Bissap Artisanal",
  forme_juridique: process.env.NEXT_PUBLIC_ENTREPRISE_FORME ?? "EI",
  siret: process.env.NEXT_PUBLIC_ENTREPRISE_SIRET ?? "À renseigner",
  adresse: process.env.NEXT_PUBLIC_ENTREPRISE_ADRESSE ?? "À renseigner",
  code_postal: process.env.NEXT_PUBLIC_ENTREPRISE_CP ?? "97400",
  ville: process.env.NEXT_PUBLIC_ENTREPRISE_VILLE ?? "Saint-Denis",
  pays: process.env.NEXT_PUBLIC_ENTREPRISE_PAYS ?? "La Réunion, France",
  telephone: process.env.NEXT_PUBLIC_ENTREPRISE_TEL ?? "",
  email:
    process.env.NEXT_PUBLIC_ENTREPRISE_EMAIL ?? "contact@bissapa.blowdok.fr",
  site_web: process.env.NEXT_PUBLIC_ENTREPRISE_WEB ?? "bissapa.blowdok.fr",
  iban: process.env.NEXT_PUBLIC_ENTREPRISE_IBAN ?? "À renseigner",
  bic: process.env.NEXT_PUBLIC_ENTREPRISE_BIC ?? "",
  banque: process.env.NEXT_PUBLIC_ENTREPRISE_BANQUE ?? "",
  /** Mention légale TVA — par défaut franchise en base art. 293 B CGI */
  mention_tva:
    process.env.NEXT_PUBLIC_ENTREPRISE_MENTION_TVA ??
    "TVA non applicable, art. 293 B du CGI",
  /** Conditions de paiement par défaut (peut être surchargé par client) */
  conditions_paiement_defaut: "Paiement à 30 jours fin de mois",
  /** Mentions de pénalités de retard (obligatoires en B2B France) */
  mention_penalites:
    "En cas de retard de paiement : pénalités au taux de 3 fois le taux d'intérêt légal (art. L441-10 du Code de commerce) et indemnité forfaitaire de 40 € pour frais de recouvrement.",
} as const;

export type EntrepriseConfig = typeof ENTREPRISE;
