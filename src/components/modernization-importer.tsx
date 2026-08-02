"use client";

import { useState, useTransition } from "react";
import { parseModernizationPaste } from "@/lib/parse-modernization-paste";
import { previewModernization, applyModernization, type ModernizationPreviewItem } from "@/lib/actions/modernize";
import { BOOKS } from "@/lib/books-meta";

export function ModernizationImporter() {
  const [text, setText] = useState("");
  const [bookOrder, setBookOrder] = useState<number | "">("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [preview, setPreview] = useState<ModernizationPreviewItem[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  function runPreview() {
    const { pairs, unmatched } = parseModernizationPaste(text);
    setUnmatched(unmatched);
    setDone(null);
    setPreview(null);
    if (pairs.length === 0) return;
    startTransition(async () => {
      const scope = bookOrder ? { bookOrder: Number(bookOrder), chapterNumber: chapterNumber ? Number(chapterNumber) : null } : null;
      const result = await previewModernization(pairs, scope);
      setPreview(result);
    });
  }

  function confirmApply() {
    if (!preview) return;
    startTransition(async () => {
      const result = await applyModernization(preview);
      setDone(`Se agregaron ${result.created} notas de modernización.`);
      setPreview(null);
      setText("");
    });
  }

  const totalMatches = preview?.reduce((n, p) => n + p.matches.length, 0) ?? 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Modernizar frases (subrayado + nota)</h2>
      <p className="text-sm text-foreground/60">
        Pega parejas de frase antigua → frase moderna, una por línea. Cada frase encontrada se
        subraya y se le agrega una nota pública con el equivalente moderno. Formato:{" "}
        <code>&ldquo;frase antigua&rdquo; → &ldquo;frase moderna&rdquo;</code>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-foreground/60">Limitar la búsqueda a:</label>
        <select
          value={bookOrder}
          onChange={(e) => setBookOrder(e.target.value ? Number(e.target.value) : "")}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">Toda la Biblia</option>
          {BOOKS.map((b) => (
            <option key={b.order} value={b.order}>
              {b.name}
            </option>
          ))}
        </select>
        {bookOrder && (
          <input
            type="number"
            min={1}
            value={chapterNumber}
            onChange={(e) => setChapterNumber(e.target.value)}
            placeholder="Capítulo (opcional)"
            className="w-36 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        )}
      </div>
      {!bookOrder && (
        <p className="text-xs text-amber-600">
          Sin libro, la búsqueda es en toda la Biblia — bien para frases únicas, riesgoso para
          palabras comunes (ej. &ldquo;engendró&rdquo; aparece en muchas genealogías).
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={'"Este es el libro de las generaciones de Adam" → "Esta es la lista de los descendientes de Adán"'}
        className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={runPreview}
          disabled={!text.trim() || pending}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          Vista previa
        </button>
        {preview && totalMatches > 0 && (
          <button
            type="button"
            onClick={confirmApply}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Aplicar {totalMatches} coincidencias
          </button>
        )}
      </div>

      {done && <p className="text-sm text-emerald-600">{done}</p>}

      {unmatched.length > 0 && (
        <div className="rounded-md bg-red-500/10 p-2 text-sm text-red-600">
          <p className="font-medium">No reconocí estas líneas (revisa el formato):</p>
          <p className="mt-1 italic">{unmatched.join(" · ")}</p>
        </div>
      )}

      {preview && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {preview.length} frases, {totalMatches} coincidencias encontradas:
          </p>
          <div className="max-h-96 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {preview.map((p, i) => (
              <div key={i} className="mb-3">
                <p className="font-medium">
                  &ldquo;{p.oldPhrase}&rdquo; → &ldquo;{p.newPhrase}&rdquo;{" "}
                  <span className={p.matches.length === 0 ? "text-red-600" : "text-foreground/50"}>
                    ({p.matches.length} coincidencia{p.matches.length === 1 ? "" : "s"})
                  </span>
                </p>
                {p.matches.length > 0 && (
                  <ul className="ml-4 mt-1 list-disc text-foreground/60">
                    {p.matches.map((m, j) => (
                      <li key={j}>
                        {m.bookName} {m.chapterNumber}:{m.verseNumber}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
