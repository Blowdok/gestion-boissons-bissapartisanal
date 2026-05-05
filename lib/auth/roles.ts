export type Role = "patron" | "fabrication" | "livreur";

export const ROLES: readonly Role[] = ["patron", "fabrication", "livreur"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  patron: "Patron",
  fabrication: "Fabrication",
  livreur: "Livreur",
};

export const ROLE_HOME: Record<Role, string> = {
  patron: "/dashboard",
  fabrication: "/stock",
  livreur: "/livraisons/tournee",
};
