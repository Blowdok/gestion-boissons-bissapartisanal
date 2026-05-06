"use client";

import { useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { envoyerFactureParEmail } from "../actions";

export function EnvoiEmailButton({
  factureId,
  clientEmail,
}: {
  factureId: string;
  clientEmail: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="default"
      disabled={pending || !clientEmail}
      title={
        clientEmail
          ? `Envoyer la facture à ${clientEmail}`
          : "Le client n'a pas d'email enregistré"
      }
      onClick={() =>
        start(async () => {
          const res = await envoyerFactureParEmail(factureId);
          if (res.status === "ok") {
            toast.success(`Facture envoyée à ${res.email}.`);
          } else if (res.status === "no_email") {
            toast.warning("Le client n'a pas d'email enregistré.");
          } else if (res.status === "no_api_key") {
            toast.error(
              "Service d'envoi non configuré (RESEND_API_KEY manquante dans .env.local).",
            );
          } else {
            toast.error(`Échec : ${res.message}`);
          }
        })
      }
    >
      <Mail className="size-4" />
      {pending ? "Envoi…" : "Envoyer par email"}
    </Button>
  );
}
