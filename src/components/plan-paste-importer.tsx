"use client";

import { useState, useTransition } from "react";
import { parseReadingPlanPaste } from "@/lib/reading-plan-parser";
import { addPlanChapters } from "@/lib/actions/reading-plans";

export function PlanPasteImporter({ planId }: { planId: string }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ bookName: string; chapterNumber: number }[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  function runPreview() {
    const { refs, unmatched } = parseReadingPlanPaste(text);
    setPreview(refs.map((r) => ({ bookName: r.bookName, chapterNumber: r.chapterNumber })));
    setUnmatched(unmatched);
    setDone(null);
  }

  function confirmImport() {
    if (!preview || preview.length === 0) return;
    const { refs } = parseReadingPlanPaste(text);
    startTransition(async () => {
      await addPlanChapters(
        planId,
        refs.map((r) => ({ bookOrder: r.bookOrder, chapterNumber: r.chapterNumber }))
      );
      setDone(`Se agregaron ${refs.length} capítulos al plan.`);
      setPreview(null);
      setUnmatched([]);
      setText("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Pegar lecturas</h2>
      <p className="text-sm text-foreground/60">
        Pega el texto tal como está en tu calendario (día por día, con abreviaturas comunes como
        &ldquo;Gn.&rdquo;, &ldquo;1 S.&rdquo;, &ldquo;Sal.&rdquo;). El número de día se ignora — solo
        importa el orden en que aparecen las lecturas. Ejemplos que reconoce: &ldquo;Isaías
        49-53&rdquo;, &ldquo;2 Samuel 7:1-29, 1 Cro. 17:1-27&rdquo;, &ldquo;Colosenses y
        Filemón&rdquo;, &ldquo;Efesios&rdquo;.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={"1  Gn. 1-3\n2  Gn. 4-7\n..."}
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
            Agregar {preview.length} capítulos al plan
          </button>
        )}
      </div>

      {done && <p className="text-sm text-emerald-600">{done}</p>}

      {preview && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Se reconocieron {preview.length} capítulos:</p>
          <div className="max-h-64 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {preview.map((p, i) => (
              <span key={i} className="mr-2 inline-block">
                {p.bookName} {p.chapterNumber}
                {i < preview.length - 1 ? "," : ""}
              </span>
            ))}
          </div>
          {unmatched.length > 0 && (
            <div className="rounded-md bg-red-500/10 p-2 text-sm text-red-600">
              <p className="font-medium">No reconocí estos fragmentos (revísalos y agrégalos aparte si hace falta):</p>
              <p className="mt-1 italic">{unmatched.join(" · ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
