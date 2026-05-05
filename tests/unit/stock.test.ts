import { describe, expect, it } from "vitest";
import {
  qteDisponibleLot,
  estEnAlerte,
  dluoPassee,
  joursAvantDluo,
} from "@/lib/domain/stock";

describe("qteDisponibleLot", () => {
  it("retourne la qte produite quand pas de mouvement", () => {
    expect(qteDisponibleLot(100, [])).toBe(100);
  });

  it("decremente sur livraison et perte", () => {
    expect(
      qteDisponibleLot(100, [
        { type: "livraison", qte: 30 },
        { type: "perte", qte: 5 },
      ]),
    ).toBe(65);
  });

  it("ignore les mouvements de production (deja inclus)", () => {
    expect(
      qteDisponibleLot(100, [{ type: "production", qte: 100 }]),
    ).toBe(100);
  });

  it("peut tomber a zero", () => {
    expect(
      qteDisponibleLot(50, [
        { type: "livraison", qte: 50 },
      ]),
    ).toBe(0);
  });
});

describe("estEnAlerte", () => {
  it("vrai si dispo < seuil", () => {
    expect(estEnAlerte(40, 50)).toBe(true);
  });
  it("faux si dispo = seuil", () => {
    expect(estEnAlerte(50, 50)).toBe(false);
  });
  it("faux si dispo > seuil", () => {
    expect(estEnAlerte(60, 50)).toBe(false);
  });
});

describe("dluoPassee", () => {
  const today = new Date("2026-05-15");

  it("hier = passee", () => {
    expect(dluoPassee("2026-05-14", today)).toBe(true);
  });
  it("aujourd'hui = pas passee", () => {
    expect(dluoPassee("2026-05-15", today)).toBe(false);
  });
  it("demain = pas passee", () => {
    expect(dluoPassee("2026-05-16", today)).toBe(false);
  });
});

describe("joursAvantDluo", () => {
  const today = new Date("2026-05-15T00:00:00Z");

  it("dans 7 jours = 7", () => {
    expect(joursAvantDluo("2026-05-22T00:00:00Z", today)).toBe(7);
  });
  it("hier = -1", () => {
    expect(joursAvantDluo("2026-05-14T00:00:00Z", today)).toBe(-1);
  });
});
