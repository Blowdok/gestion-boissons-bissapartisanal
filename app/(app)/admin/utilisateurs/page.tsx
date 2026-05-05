import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/utils/format";
import { UtilisateurActions } from "./row-actions";

export const metadata = { title: "Utilisateurs · Admin" };

export default async function UtilisateursAdminPage() {
  const { supabase, profile: currentProfile } = await requireRole("patron", "adjoint");

  // Profils via RLS-safe (Patron a tous les droits)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nom, role, actif, created_at")
    .order("role")
    .order("nom");

  // On joint last_sign_in_at + email depuis l'API admin (RLS ne donne pas acces a auth.users)
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  const authMap = new Map(
    authUsers?.users.map((u) => [u.id, { email: u.email, lastSignIn: u.last_sign_in_at }]) ?? [],
  );

  return (
    <div>
      <Link
        href="/admin"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour à l&apos;administration
      </Link>

      <PageHeader
        title="Utilisateurs"
        description="Comptes Patron, Fabrication et Livreur. Création, désactivation et reset de mot de passe."
        actions={
          <Link
            href="/admin/utilisateurs/nouveau"
            className={buttonVariants({ size: "default" })}
          >
            <Plus className="size-4" />
            Nouvel utilisateur
          </Link>
        }
      />

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles && profiles.length > 0 ? (
              profiles.map((p) => {
                const auth = authMap.get(p.id);
                const isSelf = p.id === currentProfile.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.nom}
                      {isSelf ? (
                        <Badge variant="outline" className="ml-2 text-xs">
                          vous
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {auth?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[p.role as Role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {auth?.lastSignIn ? formatDateTime(auth.lastSignIn) : "Jamais"}
                    </TableCell>
                    <TableCell>
                      {p.actif ? (
                        <Badge variant="secondary">Actif</Badge>
                      ) : (
                        <Badge variant="outline">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <UtilisateurActions
                        id={p.id}
                        nom={p.nom}
                        email={auth?.email ?? ""}
                        actif={p.actif}
                        role={p.role as Role}
                        isSelf={isSelf}
                        currentUserRole={currentProfile.role as Role}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
