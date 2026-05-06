"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { clientSchema, nullify, tarifSchema } from "./schemas";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function fieldErrors(error: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createClient(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  // Livreur (commercial) peut creer un client sur le terrain.
  // Pas de tarif negocie a la creation -> prix catalogue par defaut.
  const { supabase } = await requireRole("patron", "adjoint", "livreur");

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(nullify(parsed.data))
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClient(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  // Livreur peut corriger les coordonnees d'un client (telephone, adresse...)
  const { supabase } = await requireRole("patron", "adjoint", "livreur");

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { error } = await supabase
    .from("clients")
    .update(nullify(parsed.data))
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return {};
}

export async function toggleClientActif(id: string, actif: boolean) {
  const { supabase } = await requireRole("patron", "adjoint");
  const { error } = await supabase.from("clients").update({ actif }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function upsertTarif(clientId: string, formData: FormData) {
  const { supabase } = await requireRole("patron", "adjoint");

  const parsed = tarifSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error("Tarif invalide.");
  }

  const { error } = await supabase
    .from("tarifs_clients")
    .upsert({ client_id: clientId, ...parsed.data });

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteTarif(clientId: string, produitId: string) {
  const { supabase } = await requireRole("patron", "adjoint");
  const { error } = await supabase
    .from("tarifs_clients")
    .delete()
    .eq("client_id", clientId)
    .eq("produit_id", produitId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}
