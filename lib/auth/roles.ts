export type Role = "patron" | "adjoint" | "fabrication" | "livreur";

export const ROLES: readonly Role[] = ["patron", "adjoint", "fabrication", "livreur"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  patron: "Patron",
  adjoint: "Adjoint",
  fabrication: "Fabrication",
  livreur: "Livreur",
};

export const ROLE_HOME: Record<Role, string> = {
  patron: "/dashboard",
  adjoint: "/livraisons",
  fabrication: "/stock",
  livreur: "/livraisons/tournee",
};
