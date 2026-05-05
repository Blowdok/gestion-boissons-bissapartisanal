import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Role } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Connexion · Gestion Boissons",
};

export default async function LoginPage() {
  // Si deja connecte, redirige vers la home du role
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, actif")
      .eq("id", user.id)
      .single();
    if (profile?.actif) {
      redirect(ROLE_HOME[profile.role as Role]);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre espace Gestion Boissons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Mot de passe oublié ?{" "}
          <Link
            href="/reset"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Réinitialiser
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
