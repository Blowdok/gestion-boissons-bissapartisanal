import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth/guards";
import { FacturePDF } from "@/lib/pdf/facture";
import type { PdfFactureData } from "@/lib/pdf/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Patron, Adjoint, Livreur ont acces aux factures (RLS)
  const { supabase } = await requireRole("patron", "adjoint", "livreur");

  const { data: facture, error: errFact } = await supabase
    .from("factures_avec_solde")
    .select(
      "id, numero, date_emission, montant_ht, livraison_id, client_id, montant_encaisse, montant_a_encaisser, solde, statut_paiement",
    )
    .eq("id", id)
    .maybeSingle();

  if (errFact || !facture) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  const [{ data: client }, { data: livraison }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "raison_sociale, contact, adresse, ville, code_postal, siret, email, telephone, conditions_paiement",
      )
      .eq("id", facture.client_id)
      .maybeSingle(),
    supabase
      .from("livraisons")
      .select(
        "date_livraison, lignes_livraison(qte, prix_unitaire_ht, produits(nom, format))",
      )
      .eq("id", facture.livraison_id)
      .maybeSingle(),
  ]);

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const lignes = (livraison?.lignes_livraison ?? []).map((l) => {
    const p = Array.isArray(l.produits) ? l.produits[0] : l.produits;
    return {
      produit_nom: p?.nom ?? "—",
      format: p?.format ?? null,
      qte: Number(l.qte),
      prix_unitaire_ht: Number(l.prix_unitaire_ht),
    };
  });

  const data: PdfFactureData = {
    numero: facture.numero,
    date_emission: facture.date_emission,
    date_livraison: livraison?.date_livraison ?? null,
    client,
    lignes,
    montant_ht: Number(facture.montant_ht),
    montant_encaisse: Number(facture.montant_encaisse ?? 0),
    montant_a_encaisser: Number(facture.montant_a_encaisser ?? 0),
    solde: Number(facture.solde ?? 0),
    statut_paiement: (facture.statut_paiement ?? "impaye") as
      | "paye"
      | "partiel"
      | "impaye",
  };

  const buffer = await renderToBuffer(<FacturePDF data={data} />);
  // Convert Buffer (Node) en Uint8Array compatible Web Response
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facture.numero}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
