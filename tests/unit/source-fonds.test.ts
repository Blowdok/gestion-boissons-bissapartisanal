import { describe, expect, it } from "vitest";
import {
  defaultSourcePourCategorie,
  SOURCE_PCT,
  SOURCES_FONDS,
} from "@/lib/domain/source-fonds";
import { paiementDepenseSchema } from "@/app/(app)/finance/depenses/schemas";

describe("defaultSourcePourCategorie", () => {
  it("mappe les achats opérationnels sur réinvestissement", () => {
    expect(defaultSourcePourCategorie("matieres_premieres")).toBe(
      "reinvestissement",
    );
    expect(defaultSourcePourCategorie("emballage")).toBe("reinvestissement");
    expect(defaultSourcePourCategorie("marketing")).toBe("reinvestissement");
    expect(defaultSourcePourCategorie("fournitures")).toBe("reinvestissement");
    expect(defaultSourcePourCategorie("transport")).toBe("reinvestissement");
  });

  it("mappe les coûts fixes sur charges", () => {
    expect(defaultSourcePourCategorie("loyer")).toBe("charges");
    expect(defaultSourcePourCategorie("assurance")).toBe("charges");
    expect(defaultSourcePourCategorie("energie")).toBe("charges");
    expect(defaultSourcePourCategorie("banque")).toBe("charges");
    expect(defaultSourcePourCategorie("taxes")).toBe("charges");
  });

  it("mappe salaires sur personnel", () => {
    expect(defaultSourcePourCategorie("salaires")).toBe("personnel");
  });

  it("mappe 'autre' sur réinvestissement (modifiable)", () => {
    expect(defaultSourcePourCategorie("autre")).toBe("reinvestissement");
  });
});

describe("SOURCE_PCT", () => {
  it("totalise exactement 1.0", () => {
    const total = SOURCES_FONDS.reduce((acc, s) => acc + SOURCE_PCT[s], 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("respecte la règle 50/30/20", () => {
    expect(SOURCE_PCT.reinvestissement).toBe(0.5);
    expect(SOURCE_PCT.charges).toBe(0.3);
    expect(SOURCE_PCT.personnel).toBe(0.2);
  });
});

describe("paiementDepenseSchema", () => {
  it("accepte un paiement avec date_effectif uniquement", () => {
    const r = paiementDepenseSchema.safeParse({
      montant: 50,
      date_effectif: "2026-05-07",
      mode: "virement",
    });
    expect(r.success).toBe(true);
  });

  it("accepte un paiement avec date_prevue uniquement", () => {
    const r = paiementDepenseSchema.safeParse({
      montant: 50,
      date_prevue: "2026-05-15",
      mode: "cheque",
    });
    expect(r.success).toBe(true);
  });

  it("accepte un paiement avec les deux dates", () => {
    const r = paiementDepenseSchema.safeParse({
      montant: 50,
      date_prevue: "2026-05-15",
      date_effectif: "2026-05-14",
      mode: "virement",
    });
    expect(r.success).toBe(true);
  });

  it("rejette un paiement sans aucune date", () => {
    const r = paiementDepenseSchema.safeParse({
      montant: 50,
      mode: "especes",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toMatch(/date/i);
    }
  });

  it("rejette un montant ≤ 0", () => {
    const r = paiementDepenseSchema.safeParse({
      montant: 0,
      date_effectif: "2026-05-07",
      mode: "virement",
    });
    expect(r.success).toBe(false);
  });

  it("rejette un mode inconnu", () => {
    const r = paiementDepenseSchema.safeParse({
      montant: 50,
      date_effectif: "2026-05-07",
      mode: "bitcoin",
    });
    expect(r.success).toBe(false);
  });
});
