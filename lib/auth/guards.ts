import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./roles";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireRole(...allowed: Role[]) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nom, role, actif")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.actif) redirect("/login");
  if (!allowed.includes(profile.role as Role)) redirect("/");

  return { supabase, user, profile };
}
