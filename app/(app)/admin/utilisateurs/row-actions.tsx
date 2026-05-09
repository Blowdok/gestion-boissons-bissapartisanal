"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, KeyRound, Power, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  toggleUtilisateurActif,
  envoyerResetPassword,
  changerRole,
  supprimerUtilisateur,
} from "./actions";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";

export function UtilisateurActions({
  id,
  nom,
  email,
  actif,
  role,
  isSelf,
  currentUserRole,
}: {
  id: string;
  nom: string;
  email: string;
  actif: boolean;
  role: Role;
  isSelf: boolean;
  currentUserRole: Role;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRole, setConfirmRole] = useState<Role | null>(null);

  // Regles d'autorisation cote UI (le serveur revérifie via RLS + actions)
  const isAdjointActor = currentUserRole === "adjoint";
  // L'Adjoint ne peut pas toucher aux Patron, ni aux autres Adjoints
  const targetIsProtected = isAdjointActor && (role === "patron" || role === "adjoint");
  // Le role 'patron' est reserve au vrai Patron (Emmanuel) - jamais propose
  // dans les promotions UI. Pour donner les pouvoirs etendus a un employe,
  // on utilise 'adjoint' (Patron par interim).
  const ROLES_PROMOTION_AUTORISES: Role[] = ["adjoint", "fabrication", "livreur"];
  // L'Adjoint ne peut promouvoir que vers Fabrication / Livreur
  const rolesProposables: Role[] = isAdjointActor
    ? (["fabrication", "livreur"] as Role[]).filter((r) => r !== role)
    : ROLES_PROMOTION_AUTORISES.filter((r) => r !== role);
  const peutChangerRole = !isSelf && !targetIsProtected;
  const peutToggleActif = !isSelf && !targetIsProtected;
  const peutSupprimer = !isSelf && currentUserRole === "patron";
  const peutResetPwd = actif && (currentUserRole === "patron" || !targetIsProtected);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Actions">
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {peutResetPwd ? (
            <DropdownMenuItem
              onClick={() => {
                if (!email) {
                  toast.error("Email indisponible.");
                  return;
                }
                start(async () => {
                  try {
                    await envoyerResetPassword(email);
                    toast.success("Email de réinitialisation envoyé.");
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                });
              }}
              disabled={pending}
            >
              <KeyRound className="size-4" />
              Envoyer un reset de mot de passe
            </DropdownMenuItem>
          ) : null}

          {peutChangerRole
            ? rolesProposables.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setConfirmRole(r)}>
                  <UserCog className="size-4" />
                  Changer en {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))
            : null}

          <DropdownMenuSeparator />

          {actif ? (
            peutToggleActif ? (
              <DropdownMenuItem
                onClick={() => setConfirmDeactivate(true)}
                disabled={pending}
              >
                <Power className="size-4" />
                Désactiver le compte
              </DropdownMenuItem>
            ) : null
          ) : peutToggleActif ? (
            <DropdownMenuItem
              onClick={() =>
                start(async () => {
                  try {
                    await toggleUtilisateurActif(id, true);
                    router.refresh();
                    toast.success(`${nom} réactivé.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                })
              }
              disabled={pending}
            >
              <Power className="size-4" />
              Réactiver le compte
            </DropdownMenuItem>
          ) : null}

          {peutSupprimer ? (
            <DropdownMenuItem onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 className="size-4 text-destructive" />
              <span className="text-destructive">Supprimer définitivement</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver {nom} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {nom} ne pourra plus se connecter mais l&apos;historique de ses
              actions est conservé. Tu peux le réactiver à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDeactivate(false);
                start(async () => {
                  try {
                    await toggleUtilisateurActif(id, false);
                    router.refresh();
                    toast.success(`${nom} désactivé.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                });
              }}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {nom} définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Le compte et son profil seront supprimés.
              Préfère « Désactiver » si l&apos;utilisateur a déjà créé des
              livraisons ou validé des opérations dans l&apos;application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                start(async () => {
                  try {
                    await supprimerUtilisateur(id);
                    router.refresh();
                    toast.success(`${nom} supprimé.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                });
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmRole !== null}
        onOpenChange={(o) => !o && setConfirmRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Changer le rôle de {nom} en {confirmRole ? ROLE_LABELS[confirmRole] : ""} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Les permissions seront mises à jour à la prochaine action.
              {confirmRole === "adjoint"
                ? " L'Adjoint (Patron par intérim) pourra gérer l'activité, voir le dashboard et saisir des dépenses sur les enveloppes Réinvestissement et Charges. Il n'aura pas accès à l'enveloppe Personnel ni aux suppressions définitives."
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmRole) return;
                const target = confirmRole;
                setConfirmRole(null);
                start(async () => {
                  try {
                    await changerRole(id, target);
                    router.refresh();
                    toast.success(`Rôle mis à jour : ${ROLE_LABELS[target]}.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                });
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
