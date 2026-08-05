"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import type { Highlight, Note, ContextHighlight, ContextFavorite } from "@/types/database";
import type { ChapterPersonalTopicsMap } from "@/lib/data/personal-topics";
import { createNote, updateNote, deleteNote, deleteHighlight } from "@/lib/actions/study";
import { deleteContextHighlight, toggleContextFavorite } from "@/lib/actions/context-study";
import { contextFieldLabel } from "@/lib/context-fields";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { TagsInput } from "@/components/tags-input";

export function ChapterNotesPanel({
  bookId,
  bookOrder,
  chapterNumber,
  notes,
  highlights,
  contextHighlights,
  contextFavorites,
  chapterPersonalTopics,
  onJumpToVerse,
  onJumpToContext,
}: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  notes: Note[];
  highlights: Highlight[];
  contextHighlights: ContextHighlight[];
  contextFavorites: ContextFavorite[];
  chapterPersonalTopics: ChapterPersonalTopicsMap;
  onJumpToVerse?: (verseNumber: number) => void;
  onJumpToContext?: (fieldKey: string) => void;
}) {
  const taggedVerses = Object.entries(chapterPersonalTopics)
    .map(([verseNumber, tags]) => ({ verseNumber: Number(verseNumber), tags }))
    .sort((a, b) => a.verseNumber - b.verseNumber);
  const [optimisticNotes, removeOptimisticNote] = useOptimistic<Note[], string>(
    notes,
    (state, id) => state.filter((n) => n.id !== id)
  );
  const generalNote = optimisticNotes.find((n) => n.verse_number === null);
  const verseComments = optimisticNotes.filter((n) => n.verse_number !== null);
  const [generalText, setGeneralText] = useState(generalNote?.content ?? "");
  const [generalTags, setGeneralTags] = useState<string[]>(generalNote?.tags ?? []);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimisticHighlights, removeOptimisticHighlight] = useOptimistic<Highlight[], string>(
    highlights,
    (state, id) => state.filter((h) => h.id !== id)
  );
  const [optimisticContextHighlights, removeOptimisticContextHighlight] = useOptimistic<ContextHighlight[], string>(
    contextHighlights,
    (state, id) => state.filter((h) => h.id !== id)
  );
  const [optimisticContextFavorites, removeOptimisticContextFavorite] = useOptimistic<ContextFavorite[], string>(
    contextFavorites,
    (state, id) => state.filter((f) => f.id !== id)
  );

  function saveGeneral() {
    if (!generalText.trim()) return;
    const tags = generalTags;
    startTransition(async () => {
      if (generalNote) {
        await updateNote(generalNote.id, generalText.trim(), bookOrder, chapterNumber, tags);
      } else {
        await createNote({
          bookId,
          bookOrder,
          chapterNumber,
          verseNumber: null,
          highlightId: null,
          content: generalText.trim(),
          tags,
        });
      }
      setGeneralSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <section>
        <h3 className="mb-2 font-semibold">Mis etiquetas ({taggedVerses.length})</h3>
        {taggedVerses.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has etiquetado versículos en este capítulo.</p>
        )}
        <ul className="flex flex-col gap-2">
          {taggedVerses.map(({ verseNumber, tags }) => (
            <li key={verseNumber} className="rounded-md border border-border p-3 text-sm">
              <button
                onClick={() => onJumpToVerse?.(verseNumber)}
                className="font-medium text-primary hover:underline"
              >
                Versículo {verseNumber}
              </button>
              <p className="mt-1 text-foreground/70">
                {tags.map((t) => `#${t.topicName}`).join("  ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Nota general del capítulo</h3>
        <textarea
          value={generalText}
          onChange={(e) => {
            setGeneralText(e.target.value);
            setGeneralSaved(false);
          }}
          rows={5}
          placeholder="Escribe aquí tus reflexiones generales sobre este capítulo..."
          className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-2">
          <TagsInput
            value={generalTags}
            onChange={(tags) => {
              setGeneralTags(tags);
              setGeneralSaved(false);
            }}
            placeholder="Etiquetas (opcional), ej. oración"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={saveGeneral}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Guardar nota
          </button>
          {generalSaved && <span className="text-sm text-green-600 dark:text-green-400">✓ Guardada</span>}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Comentarios en versículos ({verseComments.length})</h3>
        {verseComments.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has agregado comentarios en este capítulo.</p>
        )}
        <ul className="flex flex-col gap-2">
          {verseComments.map((n) => (
            <CommentItem
              key={n.id}
              note={n}
              bookOrder={bookOrder}
              chapterNumber={chapterNumber}
              onJump={n.verse_number !== null ? () => onJumpToVerse?.(n.verse_number as number) : undefined}
              onDelete={() =>
                startTransition(async () => {
                  removeOptimisticNote(n.id);
                  await deleteNote(n.id, bookOrder, chapterNumber);
                })
              }
            />
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Resaltados y subrayados ({optimisticHighlights.length})</h3>
        {optimisticHighlights.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has resaltado nada en este capítulo.</p>
        )}
        <ul className="flex flex-col gap-2">
          {optimisticHighlights.map((h) => (
            <HighlightItem
              key={h.id}
              highlight={h}
              onJump={() => onJumpToVerse?.(h.verse_start)}
              onDelete={() =>
                startTransition(async () => {
                  removeOptimisticHighlight(h.id);
                  await deleteHighlight(h.id, bookOrder, chapterNumber);
                })
              }
            />
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Resaltados y subrayados en Contexto ({optimisticContextHighlights.length})</h3>
        {optimisticContextHighlights.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has resaltado nada en la pestaña de Contexto.</p>
        )}
        <ul className="flex flex-col gap-2">
          {optimisticContextHighlights.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <button
                onClick={() => onJumpToContext?.(h.field_key)}
                className="flex items-center gap-2 text-left hover:underline"
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: h.color }} />
                <div>
                  <p className="text-xs text-foreground/50">
                    {h.type === "subrayado" ? "Subrayado" : "Resaltado"} ·{" "}
                    <span className="text-primary">{contextFieldLabel(h.field_key)}</span>
                  </p>
                  <p className="italic">&ldquo;{h.selected_text}&rdquo;</p>
                </div>
              </button>
              <ConfirmDeleteButton
                onConfirm={() =>
                  startTransition(async () => {
                    removeOptimisticContextHighlight(h.id);
                    await deleteContextHighlight(h.id, bookOrder, chapterNumber);
                  })
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Favoritos en Contexto ({optimisticContextFavorites.length})</h3>
        {optimisticContextFavorites.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no has marcado secciones de Contexto como favoritas.</p>
        )}
        <ul className="flex flex-col gap-2">
          {optimisticContextFavorites.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <button
                onClick={() => onJumpToContext?.(f.field_key)}
                className="flex items-center gap-2 text-left text-primary hover:underline"
              >
                <Star size={14} fill="currentColor" className="text-amber-500" />
                <span>{contextFieldLabel(f.field_key)}</span>
              </button>
              <ConfirmDeleteButton
                onConfirm={() =>
                  startTransition(async () => {
                    removeOptimisticContextFavorite(f.id);
                    await toggleContextFavorite({
                      bookId,
                      bookOrder,
                      chapterNumber,
                      fieldKey: f.field_key,
                      existingId: f.id,
                    });
                  })
                }
              />
            </li>
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
  onJump,
  onDelete,
}: {
  note: Note;
  bookOrder: number;
  chapterNumber: number;
  onJump?: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);
  const [tagsText, setTagsText] = useState<string[]>(note.tags ?? []);
  const [, startTransition] = useTransition();

  return (
    <li className="rounded-md border border-border p-3 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-foreground/50">
        {onJump ? (
          <button onClick={onJump} className="font-medium text-primary hover:underline">
            Versículo {note.verse_number}
          </button>
        ) : (
          <span>Versículo {note.verse_number}</span>
        )}
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
          <div className="mt-2">
            <TagsInput value={tagsText} onChange={setTagsText} placeholder="Etiquetas (opcional), ej. oración" />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                startTransition(async () => {
                  await updateNote(note.id, text, bookOrder, chapterNumber, tagsText);
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
          {note.tags.length > 0 && (
            <p className="mt-1 text-xs text-primary">{note.tags.map((t) => `#${t}`).join("  ")}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-primary">
            <button onClick={() => setEditing(true)} className="hover:underline">
              Editar
            </button>
            <ConfirmDeleteButton onConfirm={onDelete} />
          </div>
        </>
      )}
    </li>
  );
}

function HighlightItem({
  highlight,
  onJump,
  onDelete,
}: {
  highlight: Highlight;
  onJump?: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
      <button onClick={onJump} className="flex items-center gap-2 text-left hover:underline">
        <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: highlight.color }} />
        <div>
          <p className="text-xs text-foreground/50">
            {highlight.type === "subrayado" ? "Subrayado" : "Resaltado"} · v.{" "}
            <span className="text-primary">
              {highlight.verse_start === highlight.verse_end
                ? highlight.verse_start
                : `${highlight.verse_start}-${highlight.verse_end}`}
            </span>
          </p>
          <p className="italic">&ldquo;{highlight.selected_text}&rdquo;</p>
        </div>
      </button>
      <ConfirmDeleteButton onConfirm={onDelete} />
    </li>
  );
}
