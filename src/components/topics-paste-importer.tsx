"use client";

import { useState, useTransition } from "react";
import { parseTopicsPaste } from "@/lib/parse-topics-paste";
import { bulkImportTopics } from "@/lib/actions/topics";

export function TopicsPasteImporter() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ name: string; count: number }[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  function runPreview() {
    const { groups, unmatched } = parseTopicsPaste(text);
    setPreview(groups.map((g) => ({ name: g.name, count: g.refs.length })));
    setUnmatched(unmatched);
    setDone(null);
  }

  function confirmImport() {
    if (!preview || preview.length === 0) return;
    const { groups } = parseTopicsPaste(text);
    startTransition(async () => {
      const result = await bulkImportTopics(
        groups.map((g) => ({
          name: g.name,
          refs: g.refs.map((r) => ({
            bookOrder: r.bookOrder,
            chapterNumber: r.chapterNumber,
            verseStart: r.verseStart,
            verseEnd: r.verseEnd,
          })),
        }))
      );
      setDone(`Se etiquetaron ${result.tagged} versículos en ${groups.length} temas.`);
      setPreview(null);
      setUnmatched([]);
      setText("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Pegar temas y versículos</h2>
      <p className="text-sm text-foreground/60">
        Pega bloques con el nombre del tema empezando con <code>#</code>, seguido de una lista de
        referencias (una por línea). El texto después de un guion se ignora. Ejemplo:
      </p>
      <pre className="whitespace-pre-wrap rounded-md bg-muted p-2 text-xs text-foreground/60">
        {"#Muerte\nJuan 11:25-26 — Jesús se presenta como la resurrección y la vida.\nSalmo 23:4 — Dios acompaña incluso en el valle de muerte."}
      </pre>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder={"#Muerte\nJuan 11:25-26 — ...\nSalmo 23:4 — ...\n\n#Ansiedad\nFilipenses 4:6-7 — ..."}
        className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={runPreview}
          disabled={!text.trim()}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          Vista previa
        </button>
        {preview && preview.length > 0 && (
          <button
            type="button"
            onClick={confirmImport}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Importar {preview.reduce((n, p) => n + p.count, 0)} versículos en {preview.length} temas
          </button>
        )}
      </div>

      {done && <p className="text-sm text-emerald-600">{done}</p>}

      {preview && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Se reconocieron {preview.length} temas:</p>
          <ul className="max-h-64 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {preview.map((p, i) => (
              <li key={i}>
                #{p.name} — {p.count} versículo{p.count === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
          {unmatched.length > 0 && (
            <div className="rounded-md bg-red-500/10 p-2 text-sm text-red-600">
              <p className="font-medium">No reconocí estas líneas (revísalas y agrégalas manualmente si hace falta):</p>
              <p className="mt-1 italic">{unmatched.join(" · ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
