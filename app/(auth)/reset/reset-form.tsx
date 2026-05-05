"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestReset, type ResetState } from "./actions";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<ResetState | undefined, FormData>(
    requestReset,
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
        Si un compte existe pour cette adresse, un email de réinitialisation
        vient d&apos;être envoyé. Pensez à vérifier les indésirables.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.com"
          disabled={pending}
        />
      </div>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le lien"}
      </Button>
    </form>
  );
}
