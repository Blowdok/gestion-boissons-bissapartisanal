/**
 * Type et helpers pour le jsonb lots_utilises stocke sur lignes_livraison.
 *
 * Format ecrit par le trigger allouer_lots_fifo (depuis la migration 0023) :
 *   [{ lot_id, numero_lot, dluo, qte }]
 *
 * Les lignes anterieures a 0023 ont ete backfillees par cette migration.
 * Si numero_lot est null (saisie optionnelle a la production du lot),
 * on retombe sur les 8 premiers caracteres du lot_id (UUID interne).
 */

export type LotAlloue = {
  lot_id: string;
  numero_lot: string | null;
  dluo: string;
  qte: number;
};

/**
 * Identifiant lisible d'un lot pour affichage UI ou PDF.
 * Priorite au numero saisi par l'operateur, sinon UUID tronque.
 */
export function formatLot(l: { numero_lot: string | null; lot_id: string }): string {
  if (l.numero_lot && l.numero_lot.trim() !== "") return l.numero_lot;
  return l.lot_id.slice(0, 8).toUpperCase();
}

/**
 * Resume des lots utilises pour une ligne, format texte court.
 * Ex : "2026-W12-A (500u) · 2026-W14-B (300u)"
 */
export function resumeLotsUtilises(lots: LotAlloue[]): string {
  if (!lots || lots.length === 0) return "—";
  return lots.map((l) => `${formatLot(l)} (${l.qte}u)`).join(" · ");
}

/**
 * Parse defensif d'un jsonb lots_utilises issu de Supabase.
 * Tolere null / format ancien sans numero_lot (numero_lot devient null).
 */
export function parseLotsUtilises(raw: unknown): LotAlloue[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .map((e) => ({
      lot_id: String(e.lot_id ?? ""),
      numero_lot:
        typeof e.numero_lot === "string" && e.numero_lot.trim() !== ""
          ? e.numero_lot
          : null,
      dluo: typeof e.dluo === "string" ? e.dluo : "",
      qte: Number(e.qte ?? 0),
    }))
    .filter((l) => l.lot_id !== "");
}
