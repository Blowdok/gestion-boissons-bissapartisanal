import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { ENTREPRISE } from "@/lib/config/entreprise";
import { getLogoEntreprise } from "./logo";
import { pdfStyles } from "./styles";
import type { PdfBonLivraisonData } from "./types";

const formatDate = (s: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(s));

export function BonLivraisonPDF({ data }: { data: PdfBonLivraisonData }) {
  const totalUnites = data.lignes.reduce((acc, l) => acc + l.qte, 0);
  const numeroBL = data.numero ?? `BL-${data.livraison_id.slice(0, 8).toUpperCase()}`;
  const logo = getLogoEntreprise();

  return (
    <Document
      title={`Bon de livraison ${numeroBL}`}
      author={ENTREPRISE.raison_sociale}
      subject={`Bon de livraison pour ${data.client.raison_sociale}`}
      creator="Le Bissap Artisanal"
      producer="Le Bissap Artisanal"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Header : emetteur a gauche, document a droite */}
        <View style={pdfStyles.headerRow}>
          <View style={pdfStyles.emetteurBlock}>
            {logo ? <Image src={logo} style={pdfStyles.logo} /> : null}
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
            <Text style={[pdfStyles.emetteurLine, { marginTop: 4 }]}>
              SIRET : {ENTREPRISE.siret}
            </Text>
          </View>

          <View style={pdfStyles.documentBlock}>
            <Text style={pdfStyles.documentTitle}>BON DE LIVRAISON</Text>
            <Text style={pdfStyles.documentNumero}>{numeroBL}</Text>
            <Text style={pdfStyles.documentDate}>
              Date prévue : {formatDate(data.date_prevue)}
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
          <Text style={pdfStyles.clientLabel}>Livré à</Text>
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
          {data.client.telephone ? (
            <Text style={[pdfStyles.clientLine, { marginTop: 3 }]}>
              Tél. {data.client.telephone}
            </Text>
          ) : null}
        </View>

        {/* Tableau des lignes (sans prix) */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.blColProduit}>Produit</Text>
            <Text style={pdfStyles.blColQte}>Quantité</Text>
          </View>
          {data.lignes.map((l, i) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.blColProduit}>
                {l.produit_nom}
                {l.format ? ` — ${l.format}` : ""}
              </Text>
              <Text style={pdfStyles.blColQte}>{l.qte}</Text>
            </View>
          ))}
          <View style={[pdfStyles.tableRow, { backgroundColor: "#f1f5f9" }]}>
            <Text style={[pdfStyles.blColProduit, { fontWeight: "bold" }]}>
              Total
            </Text>
            <Text style={[pdfStyles.blColQte, { fontWeight: "bold" }]}>
              {totalUnites} unités
            </Text>
          </View>
        </View>

        {/* Cadres signature */}
        <View style={pdfStyles.signatureBox}>
          <View style={pdfStyles.signatureCol}>
            <Text style={pdfStyles.signatureLabel}>Pour le livreur</Text>
            <View style={pdfStyles.signatureFrame}>
              <Text style={pdfStyles.signatureMention}>Date et signature :</Text>
            </View>
          </View>
          <View style={pdfStyles.signatureCol}>
            <Text style={pdfStyles.signatureLabel}>
              Pour le client (bon pour réception)
            </Text>
            <View style={pdfStyles.signatureFrame}>
              <Text style={pdfStyles.signatureMention}>
                Date, nom, signature et cachet :
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={{ textAlign: "center" }}>
            {ENTREPRISE.raison_sociale} · {ENTREPRISE.code_postal}{" "}
            {ENTREPRISE.ville} · SIRET {ENTREPRISE.siret}
          </Text>
          <Text style={{ textAlign: "center", marginTop: 2 }}>
            Document non comptable — la facturation fait foi.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
