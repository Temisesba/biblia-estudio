"use client";

import { useState, useTransition } from "react";
import type { ChapterContext } from "@/types/database";
import { saveChapterContext } from "@/lib/actions/context";
import { parseContextPaste } from "@/lib/parse-context-paste";

const DESGLOSE_FIELDS: { key: keyof ChapterContext; label: string }[] = [
  { key: "historical_context", label: "Contexto histórico y bíblico" },
  { key: "summary", label: "Resumen del capítulo" },
  { key: "central_teaching", label: "Enseñanza central" },
  { key: "reveals_about_god", label: "Qué revela acerca de Dios" },
  { key: "reveals_about_humanity", label: "Qué revela acerca del ser humano" },
  { key: "practical_applications", label: "Aplicaciones prácticas" },
  { key: "reflection", label: "Reflexión final" },
  { key: "prayer", label: "Oración breve" },
];

const ALL_FIELDS: { key: keyof ChapterContext; label: string }[] = [
  { key: "explanation", label: "Narrativa" },
  ...DESGLOSE_FIELDS,
];

type InnerTab = "narrativa" | "desglose";

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
  const [innerTab, setInnerTab] = useState<InnerTab>("narrativa");
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(ALL_FIELDS.map((f) => [f.key, (context?.[f.key] as string) ?? ""]))
  );
  const [pending, startTransition] = useTransition();
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  function repartirPegado() {
    const { matched, unmatchedHeaders } = parseContextPaste(pasteText);
    if (Object.keys(matched).length === 0) {
      setPasteFeedback(
        "No reconocí ningún apartado. Usa una línea con # antes de cada título, por ejemplo: #Resumen del capítulo"
      );
      return;
    }
    setValues((v) => ({ ...v, ...matched }));
    const labels = ALL_FIELDS.filter((f) => f.key in matched).map((f) => f.label);
    let msg = `Se repartió: ${labels.join(", ")}.`;
    if (unmatchedHeaders.length) msg += ` No reconocí: ${unmatchedHeaders.join(", ")}.`;
    setPasteFeedback(msg);
    setPasteText("");
    setShowPaste(false);
  }

  if (!context && !isAdmin) {
    return (
      <p className="py-8 text-center text-sm text-foreground/50">
        Aún no hay contexto disponible para este capítulo.
      </p>
    );
  }

  function save() {
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
    });
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setInnerTab("narrativa")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              innerTab === "narrativa"
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            Narrativa
          </button>
          <button
            onClick={() => setInnerTab("desglose")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              innerTab === "desglose"
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            Desglose
          </button>
        </div>
        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Editar contexto
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="rounded-lg border border-border p-3">
            <button
              type="button"
              onClick={() => setShowPaste((s) => !s)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showPaste ? "Ocultar" : "Pegar todo de una vez"}
            </button>
            {showPaste && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-xs text-foreground/60">
                  Escribe o pega el texto completo usando <code className="rounded bg-muted px-1">#</code>{" "}
                  antes de cada título, tal como aparecen abajo. Ejemplo:{" "}
                  <code className="rounded bg-muted px-1">#Resumen del capítulo</code>
                </p>
                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"#Contexto histórico y bíblico\nlalala\n#Resumen del capítulo\nlalala"}
                  className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={repartirPegado}
                  className="self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                >
                  Repartir en apartados
                </button>
              </div>
            )}
            {pasteFeedback && <p className="mt-2 text-xs text-foreground/60">{pasteFeedback}</p>}
          </div>
          {innerTab === "narrativa" && (
            <textarea
              rows={14}
              value={values.explanation}
              onChange={(e) => setValues((v) => ({ ...v, explanation: e.target.value }))}
              placeholder="Escribe aquí la narrativa corrida del capítulo: la lección tal como la compartirías al enseñarla."
              className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          )}
          {innerTab === "desglose" && (
            <div className="flex flex-col gap-4">
              {DESGLOSE_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{f.label}</span>
                  <textarea
                    rows={f.key === "summary" || f.key === "historical_context" ? 4 : 3}
                    value={values[f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="rounded-md border border-border bg-background p-2 outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={save}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Guardar contexto
            </button>
            <button onClick={() => setEditing(false)} className="rounded-md px-4 py-2 text-sm hover:bg-muted">
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          {innerTab === "narrativa" &&
            (context?.explanation ? (
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/60 p-4 text-sm leading-relaxed text-foreground/90">
                {context.explanation}
              </p>
            ) : (
              <p className="py-4 text-sm text-foreground/50">
                Aún no hay narrativa escrita para este capítulo.
              </p>
            ))}
          {innerTab === "desglose" && (
            <div className="flex flex-col gap-6">
              {DESGLOSE_FIELDS.map((f) => {
                const value = context?.[f.key] as string | null;
                if (!value) return null;
                return (
                  <section key={f.key}>
                    <h3 className="mb-1 font-semibold text-primary">{f.label}</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{value}</p>
                  </section>
                );
              })}
              {DESGLOSE_FIELDS.every((f) => !context?.[f.key]) && (
                <p className="py-4 text-sm text-foreground/50">Aún no hay desglose para este capítulo.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
