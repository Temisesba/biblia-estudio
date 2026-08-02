"use client";

import { useState, useTransition } from "react";
import type { Highlight, Note } from "@/types/database";
import { HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import {
  createNote,
  updateNote,
  deleteNote,
  deleteHighlight,
  updateHighlight,
} from "@/lib/actions/study";

export function ChapterNotesPanel({
  bookId,
  bookOrder,
  chapterNumber,
  notes,
  highlights,
}: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  notes: Note[];
  highlights: Highlight[];
}) {
  const generalNote = notes.find((n) => n.verse_number === null);
  const verseComments = notes.filter((n) => n.verse_number !== null);
  const [generalText, setGeneralText] = useState(generalNote?.content ?? "");
  const [pending, startTransition] = useTransition();

  function saveGeneral() {
    if (!generalText.trim()) return;
    startTransition(async () => {
      if (generalNote) {
        await updateNote(generalNote.id, generalText.trim(), bookOrder, chapterNumber);
      } else {
        await createNote({
          bookId,
          bookOrder,
          chapterNumber,
          verseNumber: null,
          highlightId: null,
          content: generalText.trim(),
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <section>
        <h3 className="mb-2 font-semibold">Nota general del capítulo</h3>
        <textarea
          value={generalText}
          onChange={(e) => setGeneralText(e.target.value)}
          rows={5}
          placeholder="Escribe aquí tus reflexiones generales sobre este capítulo..."
          className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={saveGeneral}
          disabled={pending}
          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Guardar nota
        </button>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Comentarios en versículos ({verseComments.length})</h3>
        {verseComments.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has agregado comentarios en este capítulo.</p>
        )}
        <ul className="flex flex-col gap-2">
          {verseComments.map((n) => (
            <CommentItem key={n.id} note={n} bookOrder={bookOrder} chapterNumber={chapterNumber} />
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Resaltados y subrayados ({highlights.length})</h3>
        {highlights.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has resaltado nada en este capítulo.</p>
        )}
        <ul className="flex flex-col gap-2">
          {highlights.map((h) => (
            <HighlightItem key={h.id} highlight={h} bookOrder={bookOrder} chapterNumber={chapterNumber} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CommentItem({
  note,
  bookOrder,
  chapterNumber,
}: {
  note: Note;
  bookOrder: number;
  chapterNumber: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);
  const [, startTransition] = useTransition();

  return (
    <li className="rounded-md border border-border p-3 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-foreground/50">
        <span>Versículo {note.verse_number}</span>
        <span>{new Date(note.created_at).toLocaleDateString("es-MX")}</span>
      </div>
      {note.quoted_text && (
        <p className="mb-2 border-l-2 border-primary/40 pl-2 text-xs italic text-foreground/60">
          &ldquo;{note.quoted_text}&rdquo;
        </p>
      )}
      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                startTransition(async () => {
                  await updateNote(note.id, text, bookOrder, chapterNumber);
                  setEditing(false);
                })
              }
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            >
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="rounded-md px-2.5 py-1 text-xs hover:bg-muted">
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{note.content}</p>
          <div className="mt-2 flex gap-3 text-xs text-primary">
            <button onClick={() => setEditing(true)} className="hover:underline">
              Editar
            </button>
            <button
              onClick={() => startTransition(() => deleteNote(note.id, bookOrder, chapterNumber))}
              className="text-red-500 hover:underline"
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function HighlightItem({
  highlight,
  bookOrder,
  chapterNumber,
}: {
  highlight: Highlight;
  bookOrder: number;
  chapterNumber: number;
}) {
  const [, startTransition] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: highlight.color }} />
        <div>
          <p className="text-xs text-foreground/50">
            {highlight.type === "subrayado" ? "Subrayado" : "Resaltado"} · v.{" "}
            {highlight.verse_start === highlight.verse_end
              ? highlight.verse_start
              : `${highlight.verse_start}-${highlight.verse_end}`}
          </p>
          <p className="italic">&ldquo;{highlight.selected_text}&rdquo;</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() =>
                startTransition(() => updateHighlight(highlight.id, { color: c.value }, bookOrder, chapterNumber))
              }
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <button
          onClick={() => startTransition(() => deleteHighlight(highlight.id, bookOrder, chapterNumber))}
          className="text-xs text-red-500 hover:underline"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}
