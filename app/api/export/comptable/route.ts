import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CSV_SEPARATOR = ";"; // standard FR pour Excel

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Echappement RFC 4180 + adapte au separateur ;
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

const MODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  carte: "Carte",
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

  // Bornes du mois
  const [year, month] = mois.split("-").map(Number);
  const debut = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const fin = new Date(year, month, 0).toISOString().slice(0, 10);

  const [{ data: factures }, { data: paiements }, { data: depenses }] =
    await Promise.all([
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
      supabase
        .from("depenses")
        .select("date, montant, categorie, description")
        .gte("date", debut)
        .lte("date", fin)
        .order("date"),
    ]);

  const lignes: string[] = [];
  // Ligne 1 : type d'export + bornes
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

  // SECTION 2 : paiements encaisses
  lignes.push(csvRow(["=== PAIEMENTS ENCAISSÉS ==="]));
  lignes.push(
    csvRow(["Date", "N° facture", "Client", "Mode", "Montant (€)", "Notes"]),
  );
  for (const p of paiements ?? []) {
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
        MODE_LABELS[p.mode] ?? p.mode,
        Number(p.montant).toFixed(2).replace(".", ","),
        p.notes ?? "",
      ]),
    );
  }
  const totalPaiements = (paiements ?? []).reduce(
    (acc, p) => acc + Number(p.montant),
    0,
  );
  lignes.push(
    csvRow(["", "", "", "TOTAL", totalPaiements.toFixed(2).replace(".", ","), ""]),
  );
  lignes.push("");

  // SECTION 3 : depenses
  lignes.push(csvRow(["=== DÉPENSES ==="]));
  lignes.push(csvRow(["Date", "Catégorie", "Description", "Montant (€)"]));
  for (const d of depenses ?? []) {
    lignes.push(
      csvRow([
        d.date,
        CATEGORIE_LABELS[d.categorie] ?? d.categorie,
        d.description ?? "",
        Number(d.montant).toFixed(2).replace(".", ","),
      ]),
    );
  }
  const totalDepenses = (depenses ?? []).reduce(
    (acc, d) => acc + Number(d.montant),
    0,
  );
  lignes.push(csvRow(["", "", "TOTAL", totalDepenses.toFixed(2).replace(".", ",")]));
  lignes.push("");

  // SECTION 4 : Resume
  lignes.push(csvRow(["=== RÉSUMÉ DU MOIS ==="]));
  lignes.push(csvRow(["CA encaissé", totalPaiements.toFixed(2).replace(".", ",")]));
  lignes.push(csvRow(["Dépenses", totalDepenses.toFixed(2).replace(".", ",")]));
  lignes.push(
    csvRow(["Résultat", (totalPaiements - totalDepenses).toFixed(2).replace(".", ",")]),
  );

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
