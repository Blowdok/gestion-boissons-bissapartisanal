import fs from "node:fs";
import path from "node:path";

/**
 * Charge le logo de l'entreprise depuis public/logo-entreprise.png
 * et le met en cache au niveau du module (lu une seule fois).
 *
 * Retourne null si le fichier est absent : les templates PDF affichent
 * alors juste le nom textuel de l'entreprise sans logo (degradation
 * gracieuse, pas de plantage).
 */
let cached: Buffer | null = null;
let chargementTente = false;

export function getLogoEntreprise(): Buffer | null {
  if (chargementTente) return cached;
  chargementTente = true;

  const cheminCustom = process.env.PDF_LOGO_PATH;
  const cheminParDefaut = path.join(
    process.cwd(),
    "public",
    "logo-entreprise.png",
  );
  const chemin = cheminCustom ?? cheminParDefaut;

  try {
    cached = fs.readFileSync(chemin);
  } catch (err) {
    console.warn(
      `[pdf/logo] logo introuvable a ${chemin}, PDFs sans logo:`,
      (err as Error).message,
    );
    cached = null;
  }
  return cached;
}
