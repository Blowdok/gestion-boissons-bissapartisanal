/**
 * Calculs de stock : utilises pour les tests unit et pour les previews UI.
 * La verite vient de la BDD via la vue stock_par_lot, ces helpers refletent
 * la meme logique en TypeScript.
 */

export type Mouvement = {
  type: "production" | "livraison" | "perte" | "ajustement";
  qte: number;
};

export function qteDisponibleLot(qteProduite: number, mouvements: Mouvement[]) {
  let disponible = qteProduite;
  for (const m of mouvements) {
    if (m.type === "livraison" || m.type === "perte") {
      disponible -= m.qte;
    }
    // production : non comptabilise (deja dans qteProduite)
    // ajustement : laisse a la BDD pour l'instant
  }
  return disponible;
}

export function estEnAlerte(qteDisponible: number, seuilAlerte: number) {
  return qteDisponible < seuilAlerte;
}

export function dluoPassee(dluo: string | Date, today: Date = new Date()) {
  const d = typeof dluo === "string" ? new Date(dluo) : dluo;
  // Compare au format ISO date (YYYY-MM-DD) pour eviter les soucis de fuseau
  const a = d.toISOString().slice(0, 10);
  const b = today.toISOString().slice(0, 10);
  return a < b;
}

export function joursAvantDluo(dluo: string | Date, today: Date = new Date()) {
  const d = typeof dluo === "string" ? new Date(dluo) : dluo;
  const ms = d.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
