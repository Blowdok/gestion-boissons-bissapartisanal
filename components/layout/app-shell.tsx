"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { navItemsForRole } from "./nav-config";
import { LogoutButton } from "./logout-button";

export type AppShellProps = {
  profile: { nom: string; role: Role };
  email: string;
  children: React.ReactNode;
};

export function AppShell({ profile, email, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const items = navItemsForRole(profile.role);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-muted/20 md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
        <SidebarContent
          profile={profile}
          email={email}
          items={items}
          pathname={pathname}
          onNavigate={() => undefined}
        />
      </aside>

      {/* Topbar mobile */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
        <Link href="/" className="text-lg font-semibold">
          Gestion Boissons
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {/* Drawer mobile */}
      {mobileOpen ? (
        <div className="border-b bg-background md:hidden">
          <SidebarContent
            profile={profile}
            email={email}
            items={items}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  );
}

function SidebarContent({
  profile,
  email,
  items,
  pathname,
  onNavigate,
}: {
  profile: AppShellProps["profile"];
  email: string;
  items: ReturnType<typeof navItemsForRole>;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-5">
        <Link href="/" className="text-lg font-semibold">
          Gestion Boissons
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Bissapa · La Réunion</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      <div className="space-y-3 p-4">
        <div>
          <p className="text-sm font-medium leading-tight">{profile.nom}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
