import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 px-6 py-16">
      <div className="w-full max-w-2xl space-y-10 text-center">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            La Réunion · Boissons artisanales
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Le Bissap Artisanal
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Gestion société — production, stock, livraisons, facturation B2B
            et finance, centralisés dans une seule application.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Se connecter
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Accès réservé aux utilisateurs autorisés (Patron, Fabrication,
          Livreur).
        </p>
      </div>
    </main>
  );
}
