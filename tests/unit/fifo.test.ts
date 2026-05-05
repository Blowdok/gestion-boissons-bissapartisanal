import { describe, expect, it } from "vitest";
import { allouerFifo, StockInsuffisantError } from "@/lib/domain/fifo";

const lots = [
  { id: "l1", dluo: "2026-09-01", quantite_disponible: 50 },
  { id: "l2", dluo: "2026-07-15", quantite_disponible: 30 },
  { id: "l3", dluo: "2026-12-31", quantite_disponible: 100 },
];

describe("allouerFifo", () => {
  it("priorise la DLUO la plus proche", () => {
    const a = allouerFifo(lots, 20);
    expect(a).toEqual([{ lot_id: "l2", dluo: "2026-07-15", quantite: 20 }]);
  });

  it("enchaîne sur le lot suivant quand un lot est épuisé", () => {
    const a = allouerFifo(lots, 60);
    expect(a).toEqual([
      { lot_id: "l2", dluo: "2026-07-15", quantite: 30 },
      { lot_id: "l1", dluo: "2026-09-01", quantite: 30 },
    ]);
  });

  it("lève StockInsuffisantError quand le total disponible ne suffit pas", () => {
    expect(() => allouerFifo(lots, 500)).toThrow(StockInsuffisantError);
  });

  it("retourne [] pour une quantité nulle ou négative", () => {
    expect(allouerFifo(lots, 0)).toEqual([]);
    expect(allouerFifo(lots, -5)).toEqual([]);
  });

  it("ignore les lots à quantité nulle", () => {
    const a = allouerFifo(
      [...lots, { id: "lvide", dluo: "2026-01-01", quantite_disponible: 0 }],
      10,
    );
    expect(a[0].lot_id).toBe("l2");
  });
});
