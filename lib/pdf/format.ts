/**
 * Helpers de formatage destines aux templates PDF.
 *
 * Probleme connu : Intl.NumberFormat("fr-FR") utilise un NNBSP (U+202F,
 * narrow non-breaking space) comme separateur de milliers. La police
 * Helvetica embarquee par defaut dans @react-pdf/renderer ne dispose pas
 * de ce glyphe et l'affiche comme "/" (notdef glyph). On remplace donc
 * tous les separateurs d'espacement Unicode par un espace ASCII simple.
 */

function nettoyerEspacesPdf(s: string): string {
  // U+202F (NNBSP), U+00A0 (NBSP), U+2009 (thin space) -> espace simple
  return s.replace(/[   ]/g, " ");
}

export function formatEUR(n: number): string {
  return nettoyerEspacesPdf(
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n),
  );
}

export function formatDatePdf(s: string): string {
  return nettoyerEspacesPdf(
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(s)),
  );
}

/**
 * Affichage en g sous le kilo, en kg avec 3 decimales au-dela.
 * Utilise sur le BL pour faciliter la pesee camion.
 */
export function formatPoidsPdf(grammes: number): string {
  if (grammes < 1000) return `${grammes} g`;
  return nettoyerEspacesPdf(
    `${(grammes / 1000).toLocaleString("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} kg`,
  );
}
