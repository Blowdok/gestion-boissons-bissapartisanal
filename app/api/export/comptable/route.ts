import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { SOURCE_LABELS, MODE_DEPENSE_LABELS } from "@/lib/domain/source-fonds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CSV_SEPARATOR = ";"; // standard FR pour Excel

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(CSV_SEPARATOR) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(CSV_SEPARATOR);
}

const CATEGORIE_LABELS: Record<string, string> = {
  matieres_premieres: "Matières premières",
  emballage: "Emballage",
  energie: "Énergie",
  transport: "Transport",
  marketing: "Marketing",
  loyer: "Loyer",
  assurance: "Assurance",
  banque: "Banque",
  salaires: "Salaires",
  taxes: "Taxes",
  fournitures: "Fournitures",
  autre: "Autre",
};

const MODE_VENTE_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  carte: "Carte",
};

const STATUT_LABELS: Record<string, string> = {
  paye: "Payée",
  partiel: "Partiel",
  prevu: "Prévu",
  a_payer: "À payer",
};

export async function GET(req: Request) {
  const { supabase } = await requireRole("patron");

  const url = new URL(req.url);
  const mois = url.searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(mois)) {
    return NextResponse.json(
      { error: "Paramètre 'mois' invalide. Format attendu : YYYY-MM" },
      { status: 400 },
    );
  }

  const [year, month] = mois.split("-").map(Number);
  const debut = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const fin = new Date(year, month, 0).toISOString().slice(0, 10);

  const [
    { data: factures },
    { data: paiementsClients },
    { data: depenses },
    { data: paiementsDepenses },
  ] = await Promise.all([
    supabase
      .from("factures")
      .select(
        "numero, date_emission, montant_ht, livraisons(client_id, clients(raison_sociale, siret))",
      )
      .gte("date_emission", debut)
      .lte("date_emission", fin)
      .order("date_emission"),
    supabase
      .from("paiements")
      .select(
        "date_encaissement, montant, mode, notes, factures(numero, livraisons(clients(raison_sociale)))",
      )
      .gte("date_encaissement", debut)
      .lte("date_encaissement", fin)
      .order("date_encaissement"),
    // Dépenses engagées dans le mois (depenses_avec_solde inclut le statut)
    supabase
      .from("depenses_avec_solde")
      .select(
        "date, montant_total, categorie, source_fonds, description, statut_paiement, deja_paye, reste_a_payer",
      )
      .gte("date", debut)
      .lte("date", fin)
      .order("date"),
    // Décaissements effectifs dans le mois (jointure dépense pour le contexte)
    supabase
      .from("paiements_depense")
      .select(
        "date_effectif, montant, mode, note, depenses(categorie, source_fonds, description)",
      )
      .not("date_effectif", "is", null)
      .gte("date_effectif", debut)
      .lte("date_effectif", fin)
      .order("date_effectif"),
  ]);

  const lignes: string[] = [];
  lignes.push(csvRow(["Export comptable", `Mois : ${mois}`, `Du ${debut} au ${fin}`]));
  lignes.push("");

  // SECTION 1 : factures emises
  lignes.push(csvRow(["=== FACTURES ÉMISES ==="]));
  lignes.push(
    csvRow(["Date", "N° facture", "Client", "SIRET client", "Montant HT (€)"]),
  );
  for (const f of factures ?? []) {
    const liv = Array.isArray(f.livraisons) ? f.livraisons[0] : f.livraisons;
    const cli = (liv && (Array.isArray(liv.clients) ? liv.clients[0] : liv.clients)) as
      | { raison_sociale: string | null; siret: string | null }
      | undefined;
    lignes.push(
      csvRow([
        f.date_emission,
        f.numero,
        cli?.raison_sociale ?? "",
        cli?.siret ?? "",
        Number(f.montant_ht).toFixed(2).replace(".", ","),
      ]),
    );
  }
  const totalFactures = (factures ?? []).reduce(
    (acc, f) => acc + Number(f.montant_ht),
    0,
  );
  lignes.push(csvRow(["", "", "", "TOTAL", totalFactures.toFixed(2).replace(".", ",")]));
  lignes.push("");

  // SECTION 2 : paiements clients encaisses
  lignes.push(csvRow(["=== PAIEMENTS CLIENTS ENCAISSÉS ==="]));
  lignes.push(
    csvRow(["Date", "N° facture", "Client", "Mode", "Montant (€)", "Notes"]),
  );
  for (const p of paiementsClients ?? []) {
    const fac = (Array.isArray(p.factures) ? p.factures[0] : p.factures) as
      | { numero?: string; livraisons?: unknown }
      | undefined;
    const liv = fac && (Array.isArray(fac.livraisons) ? fac.livraisons[0] : fac.livraisons) as
      | { clients?: unknown }
      | undefined;
    const cli = liv && (Array.isArray(liv.clients) ? liv.clients[0] : liv.clients) as
      | { raison_sociale?: string }
      | undefined;
    lignes.push(
      csvRow([
        p.date_encaissement,
        fac?.numero ?? "",
        cli?.raison_sociale ?? "",
        MODE_VENTE_LABELS[p.mode] ?? p.mode,
        Number(p.montant).toFixed(2).replace(".", ","),
        p.notes ?? "",
      ]),
    );
  }
  const totalPaiements = (paiementsClients ?? []).reduce(
    (acc, p) => acc + Number(p.montant),
    0,
  );
  lignes.push(
    csvRow(["", "", "", "TOTAL", totalPaiements.toFixed(2).replace(".", ","), ""]),
  );
  lignes.push("");

  // SECTION 3 : dépenses engagées dans le mois (engagement, pas cash flow)
  lignes.push(csvRow(["=== DÉPENSES ENGAGÉES ==="]));
  lignes.push(
    csvRow([
      "Date engagement",
      "Catégorie",
      "Enveloppe",
      "Description",
      "Statut",
      "Montant total (€)",
      "Déjà payé (€)",
      "Reste à payer (€)",
    ]),
  );
  for (const d of depenses ?? []) {
    lignes.push(
      csvRow([
        d.date,
        CATEGORIE_LABELS[d.categorie] ?? d.categorie,
        SOURCE_LABELS[d.source_fonds as keyof typeof SOURCE_LABELS] ??
          d.source_fonds,
        d.description ?? "",
        STATUT_LABELS[d.statut_paiement] ?? d.statut_paiement,
        Number(d.montant_total).toFixed(2).replace(".", ","),
        Number(d.deja_paye).toFixed(2).replace(".", ","),
        Number(d.reste_a_payer).toFixed(2).replace(".", ","),
      ]),
    );
  }
  const totalEngage = (depenses ?? []).reduce(
    (acc, d) => acc + Number(d.montant_total),
    0,
  );
  lignes.push(
    csvRow([
      "",
      "",
      "",
      "",
      "TOTAL",
      totalEngage.toFixed(2).replace(".", ","),
      "",
      "",
    ]),
  );
  lignes.push("");

  // SECTION 4 : décaissements effectifs (cash flow réel sur le mois)
  lignes.push(csvRow(["=== PAIEMENTS DE DÉPENSES (DÉCAISSEMENTS) ==="]));
  lignes.push(
    csvRow([
      "Date paiement",
      "Catégorie",
      "Enveloppe",
      "Description dépense",
      "Mode",
      "Note",
      "Montant (€)",
    ]),
  );
  for (const p of paiementsDepenses ?? []) {
    const dep = (Array.isArray(p.depenses) ? p.depenses[0] : p.depenses) as
      | { categorie?: string; source_fonds?: string; description?: string }
      | undefined;
    lignes.push(
      csvRow([
        p.date_effectif,
        CATEGORIE_LABELS[dep?.categorie ?? ""] ?? dep?.categorie ?? "",
        SOURCE_LABELS[
          (dep?.source_fonds ?? "") as keyof typeof SOURCE_LABELS
        ] ?? dep?.source_fonds ?? "",
        dep?.description ?? "",
        MODE_DEPENSE_LABELS[p.mode as keyof typeof MODE_DEPENSE_LABELS] ??
          p.mode,
        p.note ?? "",
        Number(p.montant).toFixed(2).replace(".", ","),
      ]),
    );
  }
  const totalDecaisse = (paiementsDepenses ?? []).reduce(
    (acc, p) => acc + Number(p.montant),
    0,
  );
  lignes.push(
    csvRow([
      "",
      "",
      "",
      "",
      "",
      "TOTAL",
      totalDecaisse.toFixed(2).replace(".", ","),
    ]),
  );
  lignes.push("");

  // SECTION 5 : Resume cash flow
  lignes.push(csvRow(["=== RÉSUMÉ DU MOIS ==="]));
  lignes.push(csvRow(["CA encaissé", totalPaiements.toFixed(2).replace(".", ",")]));
  lignes.push(
    csvRow(["Décaissements (paiements effectifs)", totalDecaisse.toFixed(2).replace(".", ",")]),
  );
  lignes.push(
    csvRow([
      "Résultat (cash flow)",
      (totalPaiements - totalDecaisse).toFixed(2).replace(".", ","),
    ]),
  );
  lignes.push("");
  lignes.push(csvRow(["Dépenses engagées dans le mois (info)", totalEngage.toFixed(2).replace(".", ",")]));

  // BOM UTF-8 pour qu'Excel ouvre les accents proprement
  const csv = "﻿" + lignes.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-comptable-${mois}.csv"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
