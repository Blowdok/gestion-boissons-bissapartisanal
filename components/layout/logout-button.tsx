"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "./logout-action";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      disabled={pending}
      onClick={() => start(() => logout())}
    >
      <LogOut className="size-4" />
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
