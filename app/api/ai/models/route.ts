import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import {
  filterByCapability,
  listOpenRouterModels,
  type Capability,
} from "@/lib/ai/openrouter-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/models?capability=tools|vision
 *
 * Renvoie la liste des modeles OpenRouter (eventuellement filtree par
 * capacite). Reservee a Patron + Adjoint car la liste est utilisee dans
 * les pages IA qui leur sont reservees.
 */
export async function GET(req: Request) {
  await requireRole("patron", "adjoint");

  const url = new URL(req.url);
  const capParam = url.searchParams.get("capability");
  const capability: Capability | null =
    capParam === "tools" || capParam === "vision" ? capParam : null;

  try {
    const all = await listOpenRouterModels();
    const filtered = capability ? filterByCapability(all, capability) : all;
    // Tri par nom (alphabetique) pour stabiliser l'ordre dans le selecteur
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ models: filtered });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Echec recuperation modeles" },
      { status: 502 },
    );
  }
}
