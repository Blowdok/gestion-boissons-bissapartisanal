"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleClientActif } from "../actions";

export function ClientStatutToggle({ id, actif }: { id: string; actif: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={actif ? "outline" : "default"}
      size="default"
      disabled={pending}
      onClick={() => start(() => toggleClientActif(id, !actif))}
    >
      {pending ? "…" : actif ? "Désactiver" : "Réactiver"}
    </Button>
  );
}
