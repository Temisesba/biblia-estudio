"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReadingPlan } from "@/lib/actions/reading-plans";

export function CreatePlanForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const plan = await createReadingPlan(name, description);
      setName("");
      setDescription("");
      router.push(`/admin/planes/${plan.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Crear plan de lectura</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre (ej. Lectura cronológica)"
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción breve (opcional)"
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={submit}
        disabled={pending || !name.trim()}
        className="self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Crear plan
      </button>
    </div>
  );
}
