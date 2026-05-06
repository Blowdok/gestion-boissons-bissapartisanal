import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { envoyerFactureParEmail } from "@/app/(app)/factures/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint appele juste apres "Marquer livree" pour envoyer la facture
 * par email. Recupere la facture liee a la livraison puis delegue.
 *
 * On expose ca en route plutot qu'en server action directe car le client
 * (status-actions.tsx) doit attendre que la facture existe (creee par le
 * trigger BDD a la transition livree -> il y a un petit delai entre
 * l'update de la livraison et la disponibilite de la facture via PostgREST).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireRole("patron", "adjoint", "livreur");

  const { data: facture } = await supabase
    .from("factures")
    .select("id")
    .eq("livraison_id", id)
    .maybeSingle();

  if (!facture) {
    return NextResponse.json({ status: "no_facture" });
  }

  const result = await envoyerFactureParEmail(facture.id);
  return NextResponse.json(result);
}
