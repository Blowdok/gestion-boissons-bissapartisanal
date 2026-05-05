/**
 * Allocation FIFO sur DLUO (Date Limite d'Utilisation Optimale).
 * Sélectionne les lots à consommer pour livrer une quantité demandée
 * en priorisant la DLUO la plus proche.
 *
 * Le décrément réel du stock se fait côté Postgres via un trigger
 * sur INSERT lignes_livraison ; ce module est utilisé pour la prévisualisation
 * UI (ex : "voici les lots qui seront utilisés") et les tests.
 */
export type LotDisponible = {
  id: string;
  dluo: string;
  quantite_disponible: number;
};

export type AllocationLot = {
  lot_id: string;
  dluo: string;
  quantite: number;
};

export class StockInsuffisantError extends Error {
  constructor(public manquant: number) {
    super(`Stock insuffisant : ${manquant} unités manquantes`);
    this.name = "StockInsuffisantError";
  }
}

export function allouerFifo(
  lots: LotDisponible[],
  quantiteDemandee: number,
): AllocationLot[] {
  if (quantiteDemandee <= 0) return [];

  const tries = [...lots].sort((a, b) => a.dluo.localeCompare(b.dluo));
  const allocations: AllocationLot[] = [];
  let restant = quantiteDemandee;

  for (const lot of tries) {
    if (restant <= 0) break;
    if (lot.quantite_disponible <= 0) continue;

    const prise = Math.min(lot.quantite_disponible, restant);
    allocations.push({ lot_id: lot.id, dluo: lot.dluo, quantite: prise });
    restant -= prise;
  }

  if (restant > 0) {
    throw new StockInsuffisantError(restant);
  }

  return allocations;
}
