"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  NIVEAUX_RELANCE,
  NIVEAU_DESCRIPTIONS,
  NIVEAU_LABELS,
  niveauParAnciennete,
  type NiveauRelance,
} from "@/lib/ai/relance";
import { ModelPicker } from "@/components/ai/model-picker";
import { useModelPreference } from "@/lib/ai/use-model-preference";
import { MODELS } from "@/lib/ai/models";
import {
  envoyerRelance,
  genererBrouillonRelance,
} from "./relance-actions";

const RECOMMENDED_REDACTION = [
  MODELS.redaction,
  "anthropic/claude-sonnet-4.6",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
];

type Props = {
  factureId: string;
  numeroFacture: string;
  ancienneteJours: number;
  hasEmail: boolean;
};

export function RelanceModal({
  factureId,
  numeroFacture,
  ancienneteJours,
  hasEmail,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEnvoi, setConfirmEnvoi] = useState(false);
  const [niveau, setNiveau] = useState<NiveauRelance>(
    niveauParAnciennete(ancienneteJours),
  );
  const [sujet, setSujet] = useState<string>("");
  const [contenuHtml, setContenuHtml] = useState<string>("");
  const [contenuTexte, setContenuTexte] = useState<string>("");
  const [genere, setGenere] = useState(false);
  const [generating, startGenerate] = useTransition();
  const [sending, startSend] = useTransition();

  const { model, setModel } = useModelPreference("redaction", MODELS.redaction);

  const handleGenerate = () =>
    startGenerate(async () => {
      const r = await genererBrouillonRelance(factureId, niveau, model);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      setSujet(r.contenu.sujet);
      setContenuHtml(r.contenu.texte_html);
      setContenuTexte(r.contenu.texte_brut);
      setGenere(true);
      toast.success("Brouillon généré. Vérifiez et ajustez avant l'envoi.");
    });

  const handleSend = () =>
    startSend(async () => {
      const r = await envoyerRelance({
        factureId,
        niveau,
        sujet,
        contenuHtml,
        contenuTexte,
      });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success("Relance envoyée.");
      setOpen(false);
      // Reset pour la prochaine ouverture
      setSujet("");
      setContenuHtml("");
      setContenuTexte("");
      setGenere(false);
      router.refresh();
    });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={!hasEmail}
              title={
                hasEmail
                  ? "Générer un email de relance"
                  : "Pas d'email client — relance impossible"
              }
            />
          }
        >
          <Mail className="size-4" />
          Relance
        </DialogTrigger>

        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-b p-4">
            <DialogTitle>Relance facture {numeroFacture}</DialogTitle>
            <DialogDescription>
              Ancienneté : {ancienneteJours} jour(s). Le ton est suggéré
              automatiquement, vous pouvez le modifier.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Sélecteur de niveau */}
              <div>
                <Label htmlFor="niveau-select">Ton de la relance</Label>
                <Select
                  value={niveau}
                  onValueChange={(v) => {
                    setNiveau(v as NiveauRelance);
                    setGenere(false); // force regénération si on change le niveau
                  }}
                  disabled={generating || sending}
                >
                  <SelectTrigger id="niveau-select" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEAUX_RELANCE.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NIVEAU_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {NIVEAU_DESCRIPTIONS[niveau]}
                </p>
              </div>

              {/* Sélecteur de modèle */}
              <div>
                <Label className="text-xs">Modèle de rédaction</Label>
                <div className="mt-1">
                  <ModelPicker
                    value={model}
                    onChange={setModel}
                    disabled={generating || sending}
                    recommended={RECOMMENDED_REDACTION}
                    hint="Modèle utilisé pour rédiger l'email. Claude Haiku par défaut (rapide, qualité suffisante pour de l'email court)."
                  />
                </div>
              </div>

              {/* Bouton générer */}
              {!genere ? (
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || sending}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Génération en cours…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Générer le brouillon
                    </>
                  )}
                </Button>
              ) : null}

              {/* Brouillon éditable */}
              {genere ? (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Brouillon — modifiable avant envoi
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generating || sending}
                    >
                      <Sparkles className="size-3.5" />
                      Régénérer
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="sujet" className="text-xs">
                      Objet
                    </Label>
                    <Input
                      id="sujet"
                      value={sujet}
                      onChange={(e) => setSujet(e.target.value)}
                      disabled={sending}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="texte" className="text-xs">
                      Contenu (texte brut — sera reformaté en HTML à l&apos;envoi)
                    </Label>
                    <textarea
                      id="texte"
                      value={contenuTexte}
                      onChange={(e) => setContenuTexte(e.target.value)}
                      rows={12}
                      disabled={sending}
                      className="mt-1 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Aperçu HTML envoyé
                    </summary>
                    <div
                      className="mt-2 rounded border bg-background p-3 text-foreground"
                      // L'IA produit du HTML simple validé par le schéma Zod ;
                      // l'utilisateur Patron est seul rédacteur, pas de risque XSS pratique.
                      dangerouslySetInnerHTML={{ __html: contenuHtml }}
                    />
                  </details>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="rounded-b-xl border-t bg-muted/40 p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmEnvoi(true)}
              disabled={!genere || sending || !sujet.trim() || !contenuTexte.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Envoyer la relance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmEnvoi} onOpenChange={setConfirmEnvoi}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;envoi ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une relance « {NIVEAU_LABELS[niveau]} » va être envoyée au client.
              Une trace sera conservée et empêchera l&apos;envoi d&apos;une nouvelle
              relance pendant 7 jours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmEnvoi(false);
                handleSend();
              }}
            >
              Envoyer maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
