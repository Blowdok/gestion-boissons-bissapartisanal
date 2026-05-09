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
  adjoint: "/dashboard",
  fabrication: "/stock",
  livreur: "/livraisons/tournee",
};

/**
 * Suffixe le nom d'un utilisateur avec son role abbrege quand il est Adjoint
 * (par ex. "Marie (adj)") pour signaler clairement qui assume le role
 * temporaire de Patron-suppleant. Pour les autres roles, retourne le nom tel quel.
 */
export function formatNomRole(nom: string, role: Role): string {
  if (role === "adjoint") return `${nom} (adj)`;
  return nom;
}
