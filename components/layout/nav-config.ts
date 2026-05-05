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
    roles: ["patron"],
  },
  {
    href: "/stock",
    label: "Stock",
    icon: Boxes,
    roles: ["patron", "fabrication", "livreur"],
  },
  {
    href: "/production",
    label: "Production",
    icon: Factory,
    roles: ["patron", "fabrication"],
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    roles: ["patron", "livreur"],
  },
  {
    href: "/livraisons/tournee",
    label: "Ma tournée",
    icon: Route,
    roles: ["patron", "livreur"],
  },
  {
    href: "/livraisons",
    label: "Livraisons",
    icon: Truck,
    roles: ["patron", "fabrication", "livreur"],
  },
  {
    href: "/factures",
    label: "Factures",
    icon: Receipt,
    roles: ["patron", "livreur"],
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
    roles: ["patron"],
  },
];

export function navItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
