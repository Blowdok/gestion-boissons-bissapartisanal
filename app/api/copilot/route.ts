import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { requireRole } from "@/lib/auth/guards";
import { getOpenRouter } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { buildCopilotTools } from "@/lib/ai/copilot/tools";
import { COPILOT_SYSTEM_PROMPT } from "@/lib/ai/copilot/system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Patron + Adjoint uniquement (donnees financieres)
  const { supabase } = await requireRole("patron", "adjoint");

  const openrouter = getOpenRouter();
  if (!openrouter) {
    return new Response(
      JSON.stringify({
        error:
          "La fonctionnalite IA n'est pas configuree (OPENROUTER_API_KEY absente).",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openrouter(MODELS.copilot),
    system: COPILOT_SYSTEM_PROMPT,
    messages: modelMessages,
    tools: buildCopilotTools(supabase),
    // Le modele peut enchainer jusqu'a 10 etapes pour repondre (tool call
    // -> reponse -> tool call -> reponse finale). Au-dela, on coupe.
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
