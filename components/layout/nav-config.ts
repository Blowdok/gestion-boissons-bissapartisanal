import {
  LayoutDashboard,
  Package,
  Boxes,
  Factory,
  Users,
  Truck,
  Route,
  Receipt,
  Coins,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    roles: ["patron"],
  },
  {
    href: "/admin/produits",
    label: "Produits",
    icon: Package,
    roles: ["patron", "adjoint"],
  },
  {
    href: "/stock",
    label: "Stock",
    icon: Boxes,
    roles: ["patron", "adjoint", "fabrication", "livreur"],
  },
  {
    href: "/production",
    label: "Production",
    icon: Factory,
    roles: ["patron", "adjoint", "fabrication"],
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    roles: ["patron", "adjoint", "livreur", "fabrication"],
  },
  {
    href: "/livraisons/tournee",
    label: "Ma tournée",
    icon: Route,
    roles: ["patron", "adjoint", "livreur"],
  },
  {
    href: "/livraisons",
    label: "Livraisons",
    icon: Truck,
    roles: ["patron", "adjoint", "fabrication", "livreur"],
  },
  {
    href: "/factures",
    label: "Factures",
    icon: Receipt,
    roles: ["patron", "adjoint", "livreur"],
  },
  {
    href: "/finance",
    label: "Finance",
    icon: Coins,
    roles: ["patron"],
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Settings,
    roles: ["patron", "adjoint"],
  },
];

export function navItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
