import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth/guards";
import { BonLivraisonPDF } from "@/lib/pdf/bon-livraison";
import type { PdfBonLivraisonData } from "@/lib/pdf/types";

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
      id, date_prevue, date_livraison, client_id,
      clients(raison_sociale, contact, adresse, ville, code_postal, siret, email, telephone, conditions_paiement),
      lignes_livraison(qte, prix_unitaire_ht, produits(nom, format, poids_grammes))
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !livraison) {
    return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });
  }

  const client = Array.isArray(livraison.clients)
    ? livraison.clients[0]
    : livraison.clients;

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  // Recupere le numero de facture si livree
  const { data: facture } = await supabase
    .from("factures")
    .select("numero")
    .eq("livraison_id", id)
    .maybeSingle();

  const lignes = (livraison.lignes_livraison ?? []).map((l) => {
    const p = Array.isArray(l.produits) ? l.produits[0] : l.produits;
    return {
      produit_nom: p?.nom ?? "—",
      format: p?.format ?? null,
      poids_grammes: p?.poids_grammes ?? null,
      qte: Number(l.qte),
      prix_unitaire_ht: Number(l.prix_unitaire_ht),
    };
  });

  const data: PdfBonLivraisonData = {
    livraison_id: livraison.id,
    numero: facture?.numero
      ? `BL-${facture.numero.replace("FAC-", "")}`
      : null,
    date_prevue: livraison.date_prevue,
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
