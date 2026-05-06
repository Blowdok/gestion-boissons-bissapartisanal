import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { isAiActive } from "@/lib/ai/client";
import { PageHeader } from "@/components/layout/page-header";
import { CopilotChat } from "./chat";

export const metadata = { title: "Copilot" };

export default async function CopilotPage() {
  // Patron + Adjoint uniquement (acces aux donnees financieres globales)
  await requireRole("patron", "adjoint");

  if (!isAiActive()) {
    return (
      <div>
        <PageHeader
          title="Patron Copilot"
          description="Assistant business pour Le Bissap Artisanal."
        />
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
          <Sparkles className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Fonctionnalité IA non activée</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure la variable <code>OPENROUTER_API_KEY</code> dans Netlify
            pour activer le copilote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Patron Copilot"
        description="Pose tes questions sur l'activité en langage naturel — ventes, stocks, clients, finance."
      />
      <CopilotChat />
    </div>
  );
}
