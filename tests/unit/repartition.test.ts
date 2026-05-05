import { describe, expect, it } from "vitest";
import { calculerRepartition } from "@/lib/domain/repartition";

describe("calculerRepartition", () => {
  it("ventile correctement un résultat positif", () => {
    const r = calculerRepartition(10000, 4000);
    expect(r.resultat).toBe(6000);
    expect(r.charges).toBe(1800);
    expect(r.personnel).toBe(1200);
    expect(r.reinvestissement).toBe(3000);
    expect(r.charges + r.personnel + r.reinvestissement).toBe(r.resultat);
  });

  it("retourne tout à zéro quand le résultat est négatif ou nul", () => {
    expect(calculerRepartition(1000, 1500)).toEqual({
      resultat: -500,
      reinvestissement: 0,
      charges: 0,
      personnel: 0,
    });
    expect(calculerRepartition(1000, 1000)).toEqual({
      resultat: 0,
      reinvestissement: 0,
      charges: 0,
      personnel: 0,
    });
  });

  it("absorbe l'arrondi sur le réinvestissement", () => {
    const r = calculerRepartition(100.01, 0);
    expect(r.charges + r.personnel + r.reinvestissement).toBeCloseTo(
      r.resultat,
      2,
    );
  });
});
