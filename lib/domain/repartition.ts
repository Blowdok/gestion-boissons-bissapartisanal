/**
 * Calcul de la répartition mensuelle 50% réinvestissement / 30% charges / 20% personnel
 * sur le résultat net (CA encaissé - dépenses du mois).
 *
 * Règles d'arrondi : centime au plus proche, le résiduel d'arrondi est absorbé
 * par le poste "réinvestissement" (poste majoritaire) pour garantir
 * réinvestissement + charges + personnel = resultat exactement.
 */
export type Repartition = {
  resultat: number;
  reinvestissement: number;
  charges: number;
  personnel: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculerRepartition(ca: number, depenses: number): Repartition {
  const resultat = round2(ca - depenses);

  if (resultat <= 0) {
    return { resultat, reinvestissement: 0, charges: 0, personnel: 0 };
  }

  const charges = round2(resultat * 0.3);
  const personnel = round2(resultat * 0.2);
  const reinvestissement = round2(resultat - charges - personnel);

  return { resultat, reinvestissement, charges, personnel };
}
