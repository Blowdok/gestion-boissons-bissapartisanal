"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModelPicker } from "@/components/ai/model-picker";
import { useModelPreference } from "@/lib/ai/use-model-preference";
import { MODELS } from "@/lib/ai/models";

const SUGGESTIONS = [
  "Quel est mon CA ce mois ?",
  "Qui ne m'a pas payé depuis plus de 30 jours ?",
  "Quels sont mes produits sous le seuil d'alerte ?",
  "Top 5 clients du mois en cours",
  "Quels lots arrivent à péremption dans les 30 prochains jours ?",
  "Quel est mon résultat ce mois et la répartition 50/30/20 ?",
];

// Modeles mis en avant dans le selecteur (les "valeurs sures" pour le copilot)
const RECOMMENDED_COPILOT = [
  MODELS.copilot,
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "google/gemini-2.5-flash",
];

export function CopilotChat() {
  const { model, setModel } = useModelPreference("copilot", MODELS.copilot);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/copilot" }),
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll automatique en bas a chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const envoyer = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Le modele choisi est passe a CHAQUE envoi (override du body) pour
    // qu'un changement de selection prenne effet immediatement, sans
    // recreer le transport.
    sendMessage({ text: trimmed }, { body: { model } });
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    envoyer(input);
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const empty = messages.length === 0;

  // Convention chat : Enter envoie, Shift+Enter insere un retour ligne
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      envoyer(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-background p-4">
        {empty ? (
          <EtatVide onPick={(q) => envoyer(q)} />
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageBulle key={m.id} message={m} />
            ))}
            {isStreaming ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Le copilote réfléchit…</span>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Carte unifiee : textarea (auto-wrap, resize-y, 3 lignes par
          defaut) + barre de controles compacte en bas avec le picker
          a gauche et les actions a droite. Tout est groupe pour gagner
          de la place verticale et laisser plus d'espace aux messages. */}
      <form
        onSubmit={handleSubmit}
        className="mt-2 rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Pose ta question (CA, clients, stock, factures impayées…) — Entrée pour envoyer, Maj+Entrée pour aller à la ligne"
          className="block w-full resize-y rounded-t-md bg-transparent px-3 py-1.5 text-sm leading-snug focus:outline-none"
          disabled={isStreaming}
        />
        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-2 py-1">
          <ModelPicker
            value={model}
            onChange={setModel}
            capability="tools"
            disabled={isStreaming}
            recommended={RECOMMENDED_COPILOT}
            hint="Le copilote a besoin de tool-calling. Liste filtrée sur les modèles compatibles."
          />
          <div className="flex items-center gap-1">
            {!empty ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMessages([])}
                disabled={isStreaming}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
              >
                <RotateCcw className="size-4" />
              </Button>
            ) : null}
            {isStreaming ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => stop()}
              >
                Stop
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={!input.trim()}>
                <Send className="size-4" />
                Envoyer
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function EtatVide({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-full bg-primary/10 p-3">
        <Sparkles className="size-8 text-primary" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-semibold">Bonjour Emmanuel 👋</h3>
        <p className="text-sm text-muted-foreground">
          Je suis ton copilote business. Pose-moi une question sur tes ventes,
          ton stock, tes clients ou ta finance.
        </p>
      </div>
      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

type ChatMessage = ReturnType<typeof useChat>["messages"][number];

function MessageBulle({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // En v6, le contenu est dans message.parts. On prend les morceaux text
  // et on ignore les tool calls intermediaires (le modele les utilise pour
  // chercher la donnee, l'utilisateur n'a pas besoin de les voir).
  const textContent = message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");

  // On affiche aussi un indicateur discret s'il y a eu des appels d'outils
  const toolCalls = message.parts.filter((p) =>
    p.type.startsWith("tool-"),
  ).length;

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <Card
        className={
          isUser
            ? "max-w-[85%] bg-primary text-primary-foreground"
            : "max-w-[85%]"
        }
      >
        <CardContent className="px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {textContent || (
              <span className="italic opacity-60">…</span>
            )}
          </p>
          {!isUser && toolCalls > 0 ? (
            <p className="mt-2 text-xs opacity-60">
              {toolCalls} requête{toolCalls > 1 ? "s" : ""} de données effectuée
              {toolCalls > 1 ? "s" : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
