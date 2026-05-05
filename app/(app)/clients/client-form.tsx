"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "./actions";

type ClientRow = {
  raison_sociale: string;
  contact: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  siret: string | null;
  conditions_paiement: string | null;
  notes: string | null;
};

type Action = (
  state: ActionState | undefined,
  formData: FormData,
) => Promise<ActionState>;

export function ClientForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Partial<ClientRow>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined,
  );

  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="raison_sociale"
          label="Raison sociale *"
          defaultValue={initial?.raison_sociale ?? ""}
          error={fe.raison_sociale}
          required
          className="sm:col-span-2"
        />
        <Field
          id="contact"
          label="Contact"
          defaultValue={initial?.contact ?? ""}
          error={fe.contact}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          defaultValue={initial?.email ?? ""}
          error={fe.email}
        />
        <Field
          id="telephone"
          label="Téléphone"
          defaultValue={initial?.telephone ?? ""}
          error={fe.telephone}
        />
        <Field
          id="siret"
          label="SIRET"
          defaultValue={initial?.siret ?? ""}
          error={fe.siret}
        />

        <Field
          id="adresse"
          label="Adresse"
          defaultValue={initial?.adresse ?? ""}
          error={fe.adresse}
          className="sm:col-span-2"
        />
        <Field
          id="ville"
          label="Ville"
          defaultValue={initial?.ville ?? ""}
          error={fe.ville}
        />
        <Field
          id="code_postal"
          label="Code postal"
          defaultValue={initial?.code_postal ?? ""}
          error={fe.code_postal}
        />

        <Field
          id="conditions_paiement"
          label="Conditions de paiement"
          placeholder="ex : 30 jours fin de mois"
          defaultValue={initial?.conditions_paiement ?? ""}
          error={fe.conditions_paiement}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {fe.notes ? <p className="mt-1 text-xs text-destructive">{fe.notes}</p> : null}
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  type = "text",
  required,
  placeholder,
  error,
  className,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="mt-2"
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
