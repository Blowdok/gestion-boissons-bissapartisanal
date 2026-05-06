import { Document, Page, Text, View } from "@react-pdf/renderer";
import { ENTREPRISE } from "@/lib/config/entreprise";
import { pdfStyles } from "./styles";
import type { PdfFactureData } from "./types";

const formatEUR = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatDate = (s: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(s));

export function FacturePDF({ data }: { data: PdfFactureData }) {
  const total = data.montant_ht;
  const aDesPaiements =
    data.montant_encaisse > 0 || data.montant_a_encaisser > 0;
  const labelFinal =
    data.statut_paiement === "paye"
      ? "ACQUITTÉE"
      : data.statut_paiement === "partiel"
        ? "RESTE À PAYER"
        : "NET À PAYER";
  const valeurFinale =
    data.statut_paiement === "paye" ? 0 : data.solde;

  return (
    <Document
      title={`Facture ${data.numero}`}
      author={ENTREPRISE.raison_sociale}
      subject={`Facture pour ${data.client.raison_sociale}`}
      creator="Gestion Boissons"
      producer="Gestion Boissons"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Header : emetteur a gauche, document a droite */}
        <View style={pdfStyles.headerRow}>
          <View style={pdfStyles.emetteurBlock}>
            <Text style={pdfStyles.emetteurNom}>{ENTREPRISE.raison_sociale}</Text>
            {ENTREPRISE.gerant ? (
              <Text style={pdfStyles.emetteurLine}>
                {ENTREPRISE.gerant} — Gérant
              </Text>
            ) : null}
            {ENTREPRISE.adresse !== "À renseigner" ? (
              <Text style={[pdfStyles.emetteurLine, { marginTop: 3 }]}>
                {ENTREPRISE.adresse}
              </Text>
            ) : null}
            <Text style={pdfStyles.emetteurLine}>
              {ENTREPRISE.code_postal} {ENTREPRISE.ville}
            </Text>
            <Text style={pdfStyles.emetteurLine}>{ENTREPRISE.pays}</Text>
            {ENTREPRISE.telephone_mobile ? (
              <Text style={[pdfStyles.emetteurLine, { marginTop: 3 }]}>
                {ENTREPRISE.telephone_mobile}
              </Text>
            ) : null}
            {ENTREPRISE.telephone_fixe ? (
              <Text style={pdfStyles.emetteurLine}>
                {ENTREPRISE.telephone_fixe}
              </Text>
            ) : null}
            {ENTREPRISE.email ? (
              <Text style={pdfStyles.emetteurLine}>{ENTREPRISE.email}</Text>
            ) : null}
            <Text style={[pdfStyles.emetteurLine, { marginTop: 4 }]}>
              SIRET : {ENTREPRISE.siret}
            </Text>
          </View>

          <View style={pdfStyles.documentBlock}>
            <Text style={pdfStyles.documentTitle}>FACTURE</Text>
            <Text style={pdfStyles.documentNumero}>{data.numero}</Text>
            <Text style={pdfStyles.documentDate}>
              Émise le {formatDate(data.date_emission)}
            </Text>
            {data.date_livraison ? (
              <Text style={pdfStyles.documentDate}>
                Livrée le {formatDate(data.date_livraison)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Client */}
        <View style={pdfStyles.clientBox}>
          <Text style={pdfStyles.clientLabel}>Facturé à</Text>
          <Text style={pdfStyles.clientNom}>{data.client.raison_sociale}</Text>
          {data.client.contact ? (
            <Text style={pdfStyles.clientLine}>{data.client.contact}</Text>
          ) : null}
          {data.client.adresse ? (
            <Text style={pdfStyles.clientLine}>{data.client.adresse}</Text>
          ) : null}
          {data.client.ville ? (
            <Text style={pdfStyles.clientLine}>
              {data.client.code_postal ?? ""} {data.client.ville}
            </Text>
          ) : null}
          {data.client.siret ? (
            <Text style={[pdfStyles.clientLine, { marginTop: 3 }]}>
              SIRET : {data.client.siret}
            </Text>
          ) : null}
        </View>

        {/* Tableau des lignes */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colProduit}>Produit</Text>
            <Text style={pdfStyles.colQte}>Quantité</Text>
            <Text style={pdfStyles.colPrix}>Prix unitaire HT</Text>
            <Text style={pdfStyles.colTotal}>Total HT</Text>
          </View>
          {data.lignes.map((l, i) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colProduit}>
                {l.produit_nom}
                {l.format ? ` — ${l.format}` : ""}
              </Text>
              <Text style={pdfStyles.colQte}>{l.qte}</Text>
              <Text style={pdfStyles.colPrix}>
                {formatEUR(l.prix_unitaire_ht)}
              </Text>
              <Text style={pdfStyles.colTotal}>
                {formatEUR(l.qte * l.prix_unitaire_ht)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={pdfStyles.totalBox}>
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalLabel}>Sous-total HT</Text>
            <Text style={pdfStyles.totalValue}>{formatEUR(total)}</Text>
          </View>
          {data.montant_encaisse > 0 ? (
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Déjà encaissé</Text>
              <Text style={pdfStyles.totalValue}>
                − {formatEUR(data.montant_encaisse)}
              </Text>
            </View>
          ) : null}
          {data.montant_a_encaisser > 0 ? (
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>À encaisser (programmé)</Text>
              <Text style={pdfStyles.totalValue}>
                − {formatEUR(data.montant_a_encaisser)}
              </Text>
            </View>
          ) : null}
          <View style={pdfStyles.totalRowFinal}>
            <Text style={pdfStyles.totalLabelFinal}>{labelFinal}</Text>
            <Text style={pdfStyles.totalValueFinal}>
              {formatEUR(valeurFinale)}
            </Text>
          </View>
        </View>
        <Text style={pdfStyles.mentionTva}>{ENTREPRISE.mention_tva}</Text>
        {aDesPaiements && data.statut_paiement !== "paye" ? (
          <Text style={pdfStyles.mentionTva}>
            Cette facture a fait l'objet d'un règlement partiel.
          </Text>
        ) : null}

        {/* Footer fixe en bas */}
        <View style={pdfStyles.footer} fixed>
          <View style={pdfStyles.footerSection}>
            <Text>
              <Text style={pdfStyles.footerLabel}>Conditions de paiement : </Text>
              {data.client.conditions_paiement ??
                ENTREPRISE.conditions_paiement_defaut}
            </Text>
          </View>
          {ENTREPRISE.iban !== "À renseigner" ? (
            <View style={pdfStyles.footerSection}>
              <Text>
                <Text style={pdfStyles.footerLabel}>Règlement par virement : </Text>
                IBAN {ENTREPRISE.iban}
                {ENTREPRISE.bic ? ` · BIC ${ENTREPRISE.bic}` : ""}
                {ENTREPRISE.banque ? ` (${ENTREPRISE.banque})` : ""}
              </Text>
            </View>
          ) : null}
          <View style={pdfStyles.footerSection}>
            <Text>{ENTREPRISE.mention_penalites}</Text>
          </View>
          <Text style={{ marginTop: 4, textAlign: "center" }}>
            {ENTREPRISE.raison_sociale} · {ENTREPRISE.code_postal}{" "}
            {ENTREPRISE.ville} · SIRET {ENTREPRISE.siret}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
