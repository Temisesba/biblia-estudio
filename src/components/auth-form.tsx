"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/lib/actions/auth";

interface Field {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground/80">{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            required
            className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      ))}
      {state.error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Cargando..." : submitLabel}
      </button>
    </form>
  );
}
