"use client";

import { useActionState, useState } from "react";
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

type FormState = {
  raison_sociale: string;
  contact: string;
  email: string;
  telephone: string;
  siret: string;
  adresse: string;
  ville: string;
  code_postal: string;
  conditions_paiement: string;
  notes: string;
};

function fromInitial(initial?: Partial<ClientRow>): FormState {
  return {
    raison_sociale: initial?.raison_sociale ?? "",
    contact: initial?.contact ?? "",
    email: initial?.email ?? "",
    telephone: initial?.telephone ?? "",
    siret: initial?.siret ?? "",
    adresse: initial?.adresse ?? "",
    ville: initial?.ville ?? "",
    code_postal: initial?.code_postal ?? "",
    conditions_paiement: initial?.conditions_paiement ?? "",
    notes: initial?.notes ?? "",
  };
}

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
  const [values, setValues] = useState<FormState>(fromInitial(initial));

  const update = (k: keyof FormState) => (v: string) =>
    setValues((p) => ({ ...p, [k]: v }));

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="raison_sociale"
          label="Raison sociale *"
          value={values.raison_sociale}
          onChange={update("raison_sociale")}
          error={fe.raison_sociale}
          required
          disabled={pending}
          className="sm:col-span-2"
        />
        <Field
          id="contact"
          label="Contact"
          value={values.contact}
          onChange={update("contact")}
          error={fe.contact}
          disabled={pending}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={update("email")}
          error={fe.email}
          disabled={pending}
        />
        <Field
          id="telephone"
          label="Téléphone"
          value={values.telephone}
          onChange={update("telephone")}
          error={fe.telephone}
          disabled={pending}
        />
        <Field
          id="siret"
          label="SIRET"
          value={values.siret}
          onChange={update("siret")}
          error={fe.siret}
          disabled={pending}
        />

        <Field
          id="adresse"
          label="Adresse"
          value={values.adresse}
          onChange={update("adresse")}
          error={fe.adresse}
          disabled={pending}
          className="sm:col-span-2"
        />
        <Field
          id="ville"
          label="Ville"
          value={values.ville}
          onChange={update("ville")}
          error={fe.ville}
          disabled={pending}
        />
        <Field
          id="code_postal"
          label="Code postal"
          value={values.code_postal}
          onChange={update("code_postal")}
          error={fe.code_postal}
          disabled={pending}
        />

        <Field
          id="conditions_paiement"
          label="Conditions de paiement"
          placeholder="ex : 30 jours fin de mois"
          value={values.conditions_paiement}
          onChange={update("conditions_paiement")}
          error={fe.conditions_paiement}
          disabled={pending}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={values.notes}
            onChange={(e) => update("notes")(e.target.value)}
            disabled={pending}
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
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  error,
  className,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2"
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
