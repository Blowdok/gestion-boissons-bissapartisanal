"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { createUtilisateur, type ActionState } from "./actions";

export function UtilisateurForm({ currentUserRole }: { currentUserRole: Role }) {
  // Choix UX : on ne propose JAMAIS de creer un compte 'patron' a la volee.
  // Pour transmettre la qualite de Patron a quelqu'un (succession, associé),
  // promouvoir un compte EXISTANT via le menu 'Changer en Patron' sur sa fiche.
  // - L'Adjoint ne peut creer que Fabrication / Livreur
  // - Le Patron peut creer Adjoint, Fabrication, Livreur (mais pas un autre Patron)
  const rolesProposables: readonly Role[] =
    currentUserRole === "adjoint"
      ? (["fabrication", "livreur"] as Role[])
      : (["adjoint", "fabrication", "livreur"] as Role[]);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createUtilisateur,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  if (state?.tempPassword) {
    return (
      <Card className="max-w-2xl border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <p className="font-semibold">Compte créé avec succès ✓</p>
            <p className="text-sm text-muted-foreground">
              Communique ces identifiants à <strong>{state.newUserEmail}</strong> de
              façon sécurisée. Le mot de passe ne sera plus affiché.
            </p>
          </div>
          <dl className="rounded-md border bg-background p-4 text-sm">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </dt>
            <dd className="font-mono">{state.newUserEmail}</dd>
            <dt className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              Mot de passe temporaire
            </dt>
            <dd className="font-mono">{state.tempPassword}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            L&apos;utilisateur peut le changer immédiatement via l&apos;option
            &laquo; Mot de passe oublié &raquo; sur la page de connexion.
          </p>
          <div className="flex gap-2">
            <Link
              href="/admin/utilisateurs"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Retour à la liste
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/admin/utilisateurs/nouveau"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Créer un autre compte
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="nom">Nom *</Label>
          <Input
            id="nom"
            name="nom"
            required
            autoComplete="name"
            placeholder="Prénom Nom"
            className="mt-2"
            disabled={pending}
          />
          {fe.nom ? <p className="mt-1 text-xs text-destructive">{fe.nom}</p> : null}
        </div>

        <div>
          <Label htmlFor="role">Rôle *</Label>
          <Select name="role" defaultValue="livreur" disabled={pending}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rolesProposables.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.role ? <p className="mt-1 text-xs text-destructive">{fe.role}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            className="mt-2"
            disabled={pending}
          />
          {fe.email ? <p className="mt-1 text-xs text-destructive">{fe.email}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="password">Mot de passe (optionnel)</Label>
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="new-password"
            placeholder="Laisse vide pour générer un mot de passe temporaire"
            minLength={8}
            className="mt-2 font-mono"
            disabled={pending}
          />
          {fe.password ? (
            <p className="mt-1 text-xs text-destructive">{fe.password}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Si laissé vide, un mot de passe temporaire de 12 caractères sera
            généré et affiché une seule fois après création.
          </p>
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le compte"}
      </Button>
    </form>
  );
}
