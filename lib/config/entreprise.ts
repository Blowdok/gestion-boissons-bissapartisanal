/**
 * Configuration de l'entreprise emettrice (Le Bissap Artisanal).
 *
 * Ces informations apparaissent sur les bons de livraison et les factures
 * generes en PDF. Modifier ici pour mettre a jour partout.
 *
 * Pour personnaliser sans toucher au code (multi-environnement, dev/prod
 * differents, etc.), surcharger via les variables d'environnement
 * NEXT_PUBLIC_ENTREPRISE_*.
 */
export const ENTREPRISE = {
  raison_sociale:
    process.env.NEXT_PUBLIC_ENTREPRISE_NOM ?? "Le Bissap Artisanal",
  forme_juridique: process.env.NEXT_PUBLIC_ENTREPRISE_FORME ?? "EI",
  gerant: process.env.NEXT_PUBLIC_ENTREPRISE_GERANT ?? "Emmanuel Mbotifeno",
  siret: process.env.NEXT_PUBLIC_ENTREPRISE_SIRET ?? "815 261 599 00022",
  adresse: process.env.NEXT_PUBLIC_ENTREPRISE_ADRESSE ?? "4 Rue de Rome",
  code_postal: process.env.NEXT_PUBLIC_ENTREPRISE_CP ?? "97420",
  ville: process.env.NEXT_PUBLIC_ENTREPRISE_VILLE ?? "Le Port",
  pays: process.env.NEXT_PUBLIC_ENTREPRISE_PAYS ?? "La Réunion, France",
  telephone_mobile:
    process.env.NEXT_PUBLIC_ENTREPRISE_TEL_MOBILE ?? "(+262) 0692 20 29 25",
  telephone_fixe:
    process.env.NEXT_PUBLIC_ENTREPRISE_TEL_FIXE ?? "(+262) 0262 85 09 15",
  email:
    process.env.NEXT_PUBLIC_ENTREPRISE_EMAIL ?? "lebissapartisanal@gmail.com",
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
