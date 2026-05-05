"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimLivraison } from "../actions";

export function ClaimButton({ id, clientNom }: { id: string; clientNom: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={pending}
      className="relative z-10"
      onClick={() =>
        start(async () => {
          try {
            await claimLivraison(id);
            router.refresh();
            toast.success(`Livraison ${clientNom} prise.`);
          } catch (e) {
            toast.error(`Échec : ${(e as Error).message}`);
            router.refresh();
          }
        })
      }
    >
      <UserPlus className="size-4" />
      {pending ? "…" : "Prendre"}
    </Button>
  );
}
