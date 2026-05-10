import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth/guards";
import { BonLivraisonPDF } from "@/lib/pdf/bon-livraison";
import type { PdfBonLivraisonData } from "@/lib/pdf/types";
import { parseLotsUtilises } from "@/lib/domain/lots-utilises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Tous les roles peuvent telecharger un BL (lecture livraisons en RLS)
  const { supabase } = await requireRole(
    "patron",
    "adjoint",
    "fabrication",
    "livreur",
  );

  const { data: livraison, error } = await supabase
    .from("livraisons")
    .select(
      `
      id, date_prevue, heure_prevue, date_livraison, client_id,
      lignes_livraison(qte, prix_unitaire_ht, lots_utilises, produits(nom, format, poids_grammes))
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[pdf bon-livraison] erreur livraison:", error);
    return NextResponse.json(
      { error: `Erreur livraison: ${error.message}` },
      { status: 500 },
    );
  }
  if (!livraison) {
    return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });
  }

  // Charge le client en requete separee : evite que la RLS sur clients
  // fasse echouer silencieusement la jointure et qu'on remonte un 404
  // trompeur "Client introuvable" alors que la livraison existe bien.
  const { data: client, error: errClient } = await supabase
    .from("clients")
    .select(
      "raison_sociale, contact, adresse, ville, code_postal, siret, email, telephone, conditions_paiement",
    )
    .eq("id", livraison.client_id)
    .maybeSingle();

  if (errClient || !client) {
    console.error(
      "[pdf bon-livraison] erreur client",
      livraison.client_id,
      errClient,
    );
    return NextResponse.json(
      { error: "Client introuvable pour cette livraison." },
      { status: 404 },
    );
  }

  // Recupere le numero de facture si livree
  const { data: facture } = await supabase
    .from("factures")
    .select("numero")
    .eq("livraison_id", id)
    .maybeSingle();

  const lignes = (livraison.lignes_livraison ?? []).map((l) => {
    const p = Array.isArray(l.produits) ? l.produits[0] : l.produits;
    const lots = parseLotsUtilises(l.lots_utilises);
    return {
      produit_nom: p?.nom ?? "—",
      format: p?.format ?? null,
      poids_grammes: p?.poids_grammes ?? null,
      qte: Number(l.qte),
      prix_unitaire_ht: Number(l.prix_unitaire_ht),
      lots_utilises: lots.map((lot) => ({
        lot_id: lot.lot_id,
        numero_lot: lot.numero_lot,
        qte: lot.qte,
      })),
    };
  });

  const data: PdfBonLivraisonData = {
    livraison_id: livraison.id,
    numero: facture?.numero
      ? `BL-${facture.numero.replace("FAC-", "")}`
      : null,
    date_prevue: livraison.date_prevue,
    heure_prevue: livraison.heure_prevue ?? null,
    date_livraison: livraison.date_livraison,
    client,
    lignes,
  };

  const buffer = await renderToBuffer(<BonLivraisonPDF data={data} />);
  const bytes = new Uint8Array(buffer);
  const filename = data.numero ?? `BL-${livraison.id.slice(0, 8)}`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
