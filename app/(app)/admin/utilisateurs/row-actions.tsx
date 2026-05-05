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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}: {
  id: string;
  nom: string;
  email: string;
  actif: boolean;
  role: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRole, setConfirmRole] = useState<Role | null>(null);

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
          {actif ? (
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

          {!isSelf ? (
            <>
              {ROLES.filter((r) => r !== role).map((r) => (
                <DropdownMenuItem key={r} onClick={() => setConfirmRole(r)}>
                  <UserCog className="size-4" />
                  Changer en {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            </>
          ) : null}

          <DropdownMenuSeparator />

          {actif ? (
            !isSelf ? (
              <DropdownMenuItem
                onClick={() => setConfirmDeactivate(true)}
                disabled={pending}
              >
                <Power className="size-4" />
                Désactiver le compte
              </DropdownMenuItem>
            ) : null
          ) : (
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
          )}

          {!isSelf ? (
            <DropdownMenuItem onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 className="size-4 text-destructive" />
              <span className="text-destructive">Supprimer définitivement</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation desactivation */}
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
              onClick={() =>
                start(async () => {
                  try {
                    await toggleUtilisateurActif(id, false);
                    router.refresh();
                    toast.success(`${nom} désactivé.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                })
              }
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation suppression definitive */}
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
              onClick={() =>
                start(async () => {
                  try {
                    await supprimerUtilisateur(id);
                    toast.success(`${nom} supprimé.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  }
                })
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation changement de role */}
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
              {confirmRole === "patron"
                ? " Le compte aura accès à toutes les données financières et à l'administration."
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmRole) return;
                const target = confirmRole;
                start(async () => {
                  try {
                    await changerRole(id, target);
                    router.refresh();
                    toast.success(`Rôle mis à jour : ${ROLE_LABELS[target]}.`);
                  } catch (e) {
                    toast.error(`Échec : ${(e as Error).message}`);
                  } finally {
                    setConfirmRole(null);
                  }
                });
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pre-rendu du Select pour eviter de l'importer si pas necessaire */}
      <Select disabled value="">
        <SelectTrigger className="hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
