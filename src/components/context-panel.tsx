"use client";

import { useState, useTransition } from "react";
import type { ChapterContext } from "@/types/database";
import { saveChapterContext } from "@/lib/actions/context";

const FIELDS: { key: keyof ChapterContext; label: string }[] = [
  { key: "historical_context", label: "Contexto histórico y bíblico" },
  { key: "summary", label: "Resumen del capítulo" },
  { key: "explanation", label: "Explicación (texto libre, la lección o lo que compartirías como pastor)" },
  { key: "central_teaching", label: "Enseñanza central" },
  { key: "reveals_about_god", label: "Qué revela acerca de Dios" },
  { key: "reveals_about_humanity", label: "Qué revela acerca del ser humano" },
  { key: "practical_applications", label: "Aplicaciones prácticas" },
  { key: "reflection", label: "Reflexión final" },
  { key: "prayer", label: "Oración breve" },
];

export function ContextPanel({
  bookId,
  bookOrder,
  chapterNumber,
  context,
  isAdmin,
}: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  context: ChapterContext | null;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, (context?.[f.key] as string) ?? ""]))
  );
  const [pending, startTransition] = useTransition();

  if (!context && !isAdmin) {
    return (
      <p className="py-8 text-center text-sm text-foreground/50">
        Aún no hay contexto disponible para este capítulo.
      </p>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4 py-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{f.label}</span>
            <textarea
              rows={f.key === "explanation" ? 10 : f.key === "summary" || f.key === "historical_context" ? 4 : 3}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="rounded-md border border-border bg-background p-2 outline-none focus:border-primary"
            />
          </label>
        ))}
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await saveChapterContext(bookId, bookOrder, chapterNumber, {
                  historical_context: values.historical_context || null,
                  summary: values.summary || null,
                  explanation: values.explanation || null,
                  central_teaching: values.central_teaching || null,
                  reveals_about_god: values.reveals_about_god || null,
                  reveals_about_humanity: values.reveals_about_humanity || null,
                  practical_applications: values.practical_applications || null,
                  reflection: values.reflection || null,
                  prayer: values.prayer || null,
                });
                setEditing(false);
              })
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Guardar contexto
          </button>
          <button onClick={() => setEditing(false)} className="rounded-md px-4 py-2 text-sm hover:bg-muted">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {isAdmin && (
        <button
          onClick={() => setEditing(true)}
          className="self-end rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Editar contexto
        </button>
      )}
      {FIELDS.map((f) => {
        const value = context?.[f.key] as string | null;
        if (!value) return null;
        const isExplanation = f.key === "explanation";
        return (
          <section
            key={f.key}
            className={isExplanation ? "rounded-lg border border-border bg-muted/60 p-4" : undefined}
          >
            <h3 className="mb-1 font-semibold text-primary">{f.label}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{value}</p>
          </section>
        );
      })}
    </div>
  );
}
