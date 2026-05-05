import { requireUser } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/auth/roles";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, role, actif")
    .eq("id", user.id)
    .single();

  if (!profile?.actif) redirect("/login");

  return (
    <AppShell
      profile={{ nom: profile.nom, role: profile.role as Role }}
      email={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
