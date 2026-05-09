import { StyleSheet } from "@react-pdf/renderer";

/**
 * Styles partages pour tous les documents PDF (BL et factures).
 * Inspires d'un layout sobre et professionnel.
 */
export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  emetteurBlock: {
    width: "50%",
  },
  logo: {
    width: 110,
    height: 60,
    marginBottom: 8,
    objectFit: "contain",
  },
  emetteurNom: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#0f172a",
  },
  emetteurLine: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#475569",
  },
  documentBlock: {
    width: "45%",
    alignItems: "flex-end",
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  documentNumero: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
    fontFamily: "Courier",
  },
  documentDate: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  // Client
  clientBox: {
    marginTop: 10,
    marginBottom: 25,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#475569",
  },
  clientLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  clientNom: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  clientLine: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.4,
  },
  // Tableau lignes
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  colProduit: { width: "45%" },
  colQte: { width: "15%", textAlign: "right" },
  colPrix: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  // Sans prix (BL) — colonnes : Produit, Quantité, Poids unit., Poids ligne
  blColProduit: { width: "40%" },
  blColQte: { width: "15%", textAlign: "right" },
  blColPoidsUnit: { width: "20%", textAlign: "right" },
  blColPoidsTotal: { width: "25%", textAlign: "right" },
  // Sous-ligne discrete sous le nom du produit (numeros de lot ponctionnes)
  lotsUtilises: {
    fontSize: 7,
    color: "#64748b",
    marginTop: 2,
    fontFamily: "Courier",
  },
  // Total
  totalBox: {
    marginTop: 10,
    marginLeft: "55%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 9,
    color: "#475569",
  },
  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  totalLabelFinal: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalValueFinal: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  mentionTva: {
    fontSize: 8,
    fontStyle: "italic",
    color: "#64748b",
    marginTop: 6,
    marginLeft: "55%",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.4,
  },
  footerSection: {
    marginBottom: 4,
  },
  footerLabel: {
    fontWeight: "bold",
    color: "#475569",
  },
  // Signature (BL)
  signatureBox: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureCol: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 4,
  },
  signatureFrame: {
    minHeight: 60,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 8,
  },
  signatureMention: {
    fontSize: 7,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});
