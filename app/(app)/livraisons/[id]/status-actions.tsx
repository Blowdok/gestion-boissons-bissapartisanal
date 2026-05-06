"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, PlayCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { changerStatutLivraison } from "../actions";
import type { StatutLivraison } from "../schemas";

export function LivraisonStatusActions({
  id,
  statut,
  role,
  clientEmail,
}: {
  id: string;
  statut: StatutLivraison;
  role: "patron" | "adjoint" | "fabrication" | "livreur";
  clientEmail?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmLivree, setConfirmLivree] = useState(false);
  const [confirmAnnule, setConfirmAnnule] = useState(false);
  const [askEmail, setAskEmail] = useState(false);

  const exec = (target: StatutLivraison, label: string) =>
    start(async () => {
      try {
        await changerStatutLivraison(id, target);
        router.refresh();
        toast.success(label);
        // Si on vient de livrer ET le client a un email -> proposer l'envoi
        if (target === "livree" && clientEmail) {
          setAskEmail(true);
        }
      } catch (e) {
        toast.error(`Échec : ${(e as Error).message}`);
      }
    });

  const envoyerEmail = () =>
    start(async () => {
      // On recupere d'abord la facture qui vient d'etre creee.
      // Comme les triggers BDD generent la facture sur transition livree,
      // on attend un instant puis on appelle l'API. La facture est trouvee
      // via livraison_id.
      try {
        const res = await fetch(
          `/api/livraisons/${id}/envoyer-facture`,
          { method: "POST" },
        );
        const data = (await res.json()) as
          | { status: "ok"; email: string }
          | { status: "no_email" }
          | { status: "no_api_key" }
          | { status: "error"; message: string }
          | { status: "no_facture" };

        if (data.status === "ok") {
          toast.success(`Facture envoyée à ${data.email}.`);
        } else if (data.status === "no_email") {
          toast.warning("Le client n'a pas d'email enregistré.");
        } else if (data.status === "no_api_key") {
          toast.error(
            "Service d'envoi d'email non configuré (RESEND_API_KEY manquante).",
          );
        } else if (data.status === "no_facture") {
          toast.error("Facture pas encore générée. Patiente quelques secondes et réessaie.");
        } else {
          toast.error(`Échec : ${data.message}`);
        }
      } catch (e) {
        toast.error(`Échec réseau : ${(e as Error).message}`);
      }
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {statut === "programmee" ? (
          <Button
            variant="secondary"
            size="default"
            disabled={pending}
            onClick={() => exec("en_cours", "Livraison en cours.")}
          >
            <PlayCircle className="size-4" />
            Démarrer
          </Button>
        ) : null}

        {(statut === "programmee" || statut === "en_cours") ? (
          <Button
            variant="default"
            size="default"
            disabled={pending}
            onClick={() => setConfirmLivree(true)}
          >
            <CheckCircle2 className="size-4" />
            Marquer livrée
          </Button>
        ) : null}

        {(statut === "programmee" || statut === "en_cours") && role !== "livreur" ? (
          <Button
            variant="outline"
            size="default"
            disabled={pending}
            onClick={() => setConfirmAnnule(true)}
          >
            <XCircle className="size-4" />
            Annuler
          </Button>
        ) : null}
      </div>

      {/* Confirmation marquer livree */}
      <AlertDialog open={confirmLivree} onOpenChange={setConfirmLivree}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer comme livrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une <strong>facture sera générée automatiquement</strong> avec un
              numéro séquentiel. Le stock a déjà été décrémenté à la création
              des lignes (FIFO sur DLUO).
              {clientEmail ? (
                <>
                  <br /><br />
                  <span className="text-foreground">
                    Tu pourras envoyer la facture par email à <strong>{clientEmail}</strong>{" "}
                    juste après.
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLivree(false);
                exec("livree", "Livraison validée. Facture générée.");
              }}
            >
              Valider la livraison
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Proposer l'envoi par email apres livraison */}
      <AlertDialog open={askEmail} onOpenChange={setAskEmail}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Mail className="inline size-5 mr-2 align-text-bottom" />
              Envoyer la facture par email ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La facture est prête. L&apos;envoyer immédiatement à{" "}
              <strong>{clientEmail}</strong> ? L&apos;email contiendra le PDF
              en pièce jointe.
              <br /><br />
              <span className="text-xs text-muted-foreground">
                Tu pourras toujours la renvoyer plus tard depuis la fiche facture.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Pas maintenant</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAskEmail(false);
                envoyerEmail();
              }}
            >
              Envoyer maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation annulation */}
      <AlertDialog open={confirmAnnule} onOpenChange={setConfirmAnnule}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              La livraison passe en statut <strong>« Annulée »</strong> et n&apos;est
              plus modifiable. Les mouvements de stock déjà enregistrés sont
              conservés (à compenser manuellement via un ajustement si besoin).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmAnnule(false);
                exec("annulee", "Livraison annulée.");
              }}
            >
              Annuler la livraison
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
