"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { scanTicket } from "./scan-ticket-action";
import type { CategorieDepense } from "../schemas";

export type TicketPrefill = {
  montant?: string;
  date?: string;
  categorie?: CategorieDepense;
  description?: string;
};

type Props = {
  onResult: (data: TicketPrefill) => void;
  disabled?: boolean;
  /** Modele de vision a utiliser. Si omis, l'API tombe sur le defaut. */
  model?: string;
};

/**
 * Bouton "Scanner un ticket" : ouvre le selecteur de fichier (avec
 * activation de la camera sur mobile via capture="environment"),
 * envoie l'image a la server action scanTicket, et appelle onResult
 * avec les valeurs extraites pour pre-remplir le formulaire parent.
 */
export function ScanTicketButton({ onResult, disabled, model }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  const handleFile = async (file: File) => {
    setPending(true);
    try {
      const fd = new FormData();
      fd.append("ticket", file);
      if (model) fd.append("model", model);
      const result = await scanTicket(fd);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const { data } = result;
      onResult({
        montant:
          data.montant != null ? data.montant.toFixed(2) : undefined,
        date: data.date ?? undefined,
        categorie: data.categorie ?? undefined,
        description: data.description ?? undefined,
      });

      const champsExtraits = [
        data.montant != null && "montant",
        data.date && "date",
        data.categorie && "catégorie",
        data.description && "description",
      ].filter(Boolean);

      if (champsExtraits.length === 0) {
        toast.warning(
          "Ticket analysé mais rien n'a pu être extrait. Saisie manuelle nécessaire.",
        );
      } else {
        toast.success(
          `Ticket analysé : ${champsExtraits.join(", ")} pré-rempli${
            champsExtraits.length > 1 ? "s" : ""
          }. Vérifiez les valeurs.`,
        );
      }
    } catch (e) {
      toast.error("Erreur inattendue : " + (e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={pending || disabled}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Analyse en cours…
          </>
        ) : (
          <>
            <Camera className="size-4" />
            Scanner un ticket
          </>
        )}
      </Button>
    </>
  );
}
