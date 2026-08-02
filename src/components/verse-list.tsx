"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type {
  Verse,
  Highlight,
  Favorite,
  Note,
  PublicAnnotation,
  Topic,
  VerseTopic,
  PersonalTopic,
  PersonalVerseTopic,
} from "@/types/database";
import type { ChapterTopicsMap } from "@/lib/data/topics";
import type { ChapterPersonalTopicsMap } from "@/lib/data/personal-topics";
import { HIGHLIGHT_COLORS, DEFAULT_COLOR } from "@/lib/highlight-colors";
import { createHighlight, deleteHighlight, toggleFavorite, createNote } from "@/lib/actions/study";
import {
  createPublicAnnotation,
  updatePublicAnnotation,
  deletePublicAnnotation,
} from "@/lib/actions/annotations";
import { getOrCreateTopic, tagVerses, untagVerse } from "@/lib/actions/topics";
import {
  getOrCreatePersonalTopic,
  tagVersesPersonal,
  untagVersePersonal,
} from "@/lib/actions/personal-topics";
import { Star, MessageCircle, Tag, Bookmark } from "lucide-react";

interface Selection {
  verseStart: number;
  verseEnd: number;
  charStart: number | null;
  charEnd: number | null;
  text: string;
}

type Mark =
  | { kind: "highlight"; start: number; end: number; color: string; underline: boolean; id: string }
  | { kind: "annotation"; start: number; end: number; id: string; annotation: PublicAnnotation };

export function VerseList({
  verses,
  bookId,
  bookOrder,
  chapterNumber,
  highlights,
  favorites,
  notes,
  publicAnnotations,
  chapterTopics,
  allTopics,
  chapterPersonalTopics,
  allPersonalTopics,
  isAdmin,
  searchQuery,
  onJumpToNotes,
}: {
  verses: Verse[];
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  highlights: Highlight[];
  favorites: Favorite[];
  notes: Note[];
  publicAnnotations: PublicAnnotation[];
  chapterTopics: ChapterTopicsMap;
  allTopics: (Topic & { verseCount: number })[];
  chapterPersonalTopics: ChapterPersonalTopicsMap;
  allPersonalTopics: (PersonalTopic & { verseCount: number })[];
  isAdmin: boolean;
  searchQuery?: string;
  onJumpToNotes?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [commentFor, setCommentFor] = useState<Selection | null>(null);
  const [commentText, setCommentText] = useState("");
  const [publicNoteFor, setPublicNoteFor] = useState<Selection | null>(null);
  const [publicNoteText, setPublicNoteText] = useState("");
  const [viewingAnnotation, setViewingAnnotation] = useState<PublicAnnotation | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState(false);
  const [annotationEditText, setAnnotationEditText] = useState("");
  const [tagFor, setTagFor] = useState<Selection | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [viewingVerseTopics, setViewingVerseTopics] = useState<{
    verseNumber: number;
    topics: (VerseTopic & { topicName: string; topicSlug: string })[];
  } | null>(null);
  const [personalTagFor, setPersonalTagFor] = useState<Selection | null>(null);
  const [personalTagQuery, setPersonalTagQuery] = useState("");
  const [viewingVersePersonalTopics, setViewingVersePersonalTopics] = useState<{
    verseNumber: number;
    topics: (PersonalVerseTopic & { topicName: string; topicSlug: string })[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if (!text) return;

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const startVerseEl = closestVerseEl(range.startContainer);
    const endVerseEl = closestVerseEl(range.endContainer);
    if (!startVerseEl || !endVerseEl) return;

    const verseStart = Number(startVerseEl.dataset.verse);
    const verseEnd = Number(endVerseEl.dataset.verse);
    let charStart: number | null = null;
    let charEnd: number | null = null;

    if (verseStart === verseEnd) {
      const textNode = startVerseEl.querySelector("[data-verse-text]");
      if (textNode) {
        const full = textNode.textContent ?? "";
        const idx = full.indexOf(text);
        if (idx >= 0) {
          charStart = idx;
          charEnd = idx + text.length;
        }
      }
    }

    setSelection({
      verseStart: Math.min(verseStart, verseEnd),
      verseEnd: Math.max(verseStart, verseEnd),
      charStart,
      charEnd,
      text,
    });
  }

  function applyHighlight(type: "resaltado" | "subrayado", color: string) {
    if (!selection) return;
    startTransition(async () => {
      await createHighlight({
        bookId,
        bookOrder,
        chapterNumber,
        verseStart: selection.verseStart,
        verseEnd: selection.verseEnd,
        charStart: selection.charStart,
        charEnd: selection.charEnd,
        selectedText: selection.text,
        type,
        color,
      });
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    });
  }

  function openComment() {
    if (!selection) return;
    setCommentFor(selection);
    setSelection(null);
  }

  function saveComment() {
    if (!commentFor || !commentText.trim()) return;
    startTransition(async () => {
      await createNote({
        bookId,
        bookOrder,
        chapterNumber,
        verseNumber: commentFor.verseStart,
        highlightId: null,
        quotedText: commentFor.text,
        content: commentText.trim(),
      });
      window.getSelection()?.removeAllRanges();
      setCommentFor(null);
      setCommentText("");
    });
  }

  function openPublicNote() {
    if (!selection || selection.verseStart !== selection.verseEnd || selection.charStart === null) return;
    setPublicNoteFor(selection);
    setSelection(null);
  }

  function savePublicNote() {
    if (!publicNoteFor || !publicNoteText.trim() || publicNoteFor.charStart === null || publicNoteFor.charEnd === null) return;
    startTransition(async () => {
      await createPublicAnnotation({
        bookId,
        bookOrder,
        chapterNumber,
        verseNumber: publicNoteFor.verseStart,
        charStart: publicNoteFor.charStart!,
        charEnd: publicNoteFor.charEnd!,
        quotedText: publicNoteFor.text,
        note: publicNoteText.trim(),
      });
      window.getSelection()?.removeAllRanges();
      setPublicNoteFor(null);
      setPublicNoteText("");
    });
  }

  function saveAnnotationEdit() {
    if (!viewingAnnotation || !annotationEditText.trim()) return;
    startTransition(async () => {
      await updatePublicAnnotation(viewingAnnotation.id, annotationEditText.trim(), bookOrder, chapterNumber);
      setViewingAnnotation(null);
      setEditingAnnotation(false);
    });
  }

  function deleteAnnotation() {
    if (!viewingAnnotation) return;
    startTransition(async () => {
      await deletePublicAnnotation(viewingAnnotation.id, bookOrder, chapterNumber);
      setViewingAnnotation(null);
      setEditingAnnotation(false);
    });
  }

  function openTag() {
    if (!selection) return;
    setTagFor(selection);
    setTagQuery("");
    setSelection(null);
  }

  function applyTag(topicId: string) {
    if (!tagFor) return;
    startTransition(async () => {
      await tagVerses({
        topicId,
        bookId,
        bookOrder,
        chapterNumber,
        verseStart: tagFor.verseStart,
        verseEnd: tagFor.verseEnd,
      });
      window.getSelection()?.removeAllRanges();
      setTagFor(null);
      setTagQuery("");
    });
  }

  function createAndApplyTag() {
    if (!tagQuery.trim() || !tagFor) return;
    startTransition(async () => {
      const topic = await getOrCreateTopic(tagQuery.trim());
      await tagVerses({
        topicId: topic.id,
        bookId,
        bookOrder,
        chapterNumber,
        verseStart: tagFor.verseStart,
        verseEnd: tagFor.verseEnd,
      });
      window.getSelection()?.removeAllRanges();
      setTagFor(null);
      setTagQuery("");
    });
  }

  function openPersonalTag() {
    if (!selection) return;
    setPersonalTagFor(selection);
    setPersonalTagQuery("");
    setSelection(null);
  }

  function applyPersonalTag(personalTopicId: string) {
    if (!personalTagFor) return;
    startTransition(async () => {
      await tagVersesPersonal({
        personalTopicId,
        bookId,
        bookOrder,
        chapterNumber,
        verseStart: personalTagFor.verseStart,
        verseEnd: personalTagFor.verseEnd,
      });
      window.getSelection()?.removeAllRanges();
      setPersonalTagFor(null);
      setPersonalTagQuery("");
    });
  }

  function createAndApplyPersonalTag() {
    if (!personalTagQuery.trim() || !personalTagFor) return;
    startTransition(async () => {
      const topic = await getOrCreatePersonalTopic(personalTagQuery.trim());
      await tagVersesPersonal({
        personalTopicId: topic.id,
        bookId,
        bookOrder,
        chapterNumber,
        verseStart: personalTagFor.verseStart,
        verseEnd: personalTagFor.verseEnd,
      });
      window.getSelection()?.removeAllRanges();
      setPersonalTagFor(null);
      setPersonalTagQuery("");
    });
  }

  function removeVersePersonalTopic(id: string) {
    startTransition(async () => {
      await untagVersePersonal(id, bookOrder, chapterNumber);
      setViewingVersePersonalTopics(null);
    });
  }

  function removeVerseTopic(id: string) {
    startTransition(async () => {
      await untagVerse(id, bookOrder, chapterNumber);
      setViewingVerseTopics(null);
    });
  }

  function favoriteFor(verseNumber: number) {
    return favorites.find(
      (f) =>
        (f.verse_start === null && f.verse_end === null) ||
        (f.verse_start !== null && f.verse_end !== null && verseNumber >= f.verse_start && verseNumber <= f.verse_end && f.verse_start === f.verse_end)
    );
  }

  function highlightsFor(verseNumber: number) {
    return highlights.filter((h) => verseNumber >= h.verse_start && verseNumber <= h.verse_end);
  }

  function commentsFor(verseNumber: number) {
    return notes.filter((n) => n.verse_number === verseNumber);
  }

  function annotationsFor(verseNumber: number) {
    return publicAnnotations.filter((a) => a.verse_number === verseNumber);
  }

  const toolbarSlot = typeof document !== "undefined" ? document.getElementById("selection-toolbar-slot") : null;

  return (
    <div className="relative" ref={containerRef} onMouseUp={handleMouseUp}>
      {toolbarSlot &&
        createPortal(
          <SelectionToolbar
            disabled={!selection}
            pending={pending}
            isAdmin={isAdmin}
            canPublicNote={!!selection && selection.verseStart === selection.verseEnd && selection.charStart !== null}
            onColor={(color) => applyHighlight("resaltado", color)}
            onUnderline={() => applyHighlight("subrayado", DEFAULT_COLOR)}
            onComment={openComment}
            onPublicNote={openPublicNote}
            onTag={openTag}
            onPersonalTag={openPersonalTag}
            onDismiss={() => {
              window.getSelection()?.removeAllRanges();
              setSelection(null);
            }}
          />,
          toolbarSlot
        )}

      <div className="verse-text flex flex-col gap-0.5">
        {verses.map((v) => {
          const vHighlights = highlightsFor(v.verse_number);
          const fav = favoriteFor(v.verse_number);
          const vComments = commentsFor(v.verse_number);
          const vAnnotations = annotationsFor(v.verse_number);
          const vTopics = chapterTopics[v.verse_number] ?? [];
          const vPersonalTopics = chapterPersonalTopics[v.verse_number] ?? [];
          const wholeVerseHighlight = vHighlights.find((h) => h.char_start === null);
          const partial = vHighlights.filter((h) => h.char_start !== null && h.verse_start === h.verse_end);

          const marks: Mark[] = [
            ...partial.map((h): Mark => ({
              kind: "highlight",
              start: h.char_start as number,
              end: h.char_end as number,
              color: h.color,
              underline: h.type === "subrayado",
              id: h.id,
            })),
            ...vAnnotations.map((a): Mark => ({
              kind: "annotation",
              start: a.char_start,
              end: a.char_end,
              id: a.id,
              annotation: a,
            })),
          ];

          const query = searchQuery?.trim().toLowerCase();
          const matchesSearch = !query || v.text.toLowerCase().includes(query);

          return (
            <p
              key={v.id}
              data-verse={v.verse_number}
              className={`group relative rounded px-2 py-0.5 hover:bg-muted/60 transition-opacity ${
                query ? (matchesSearch ? "" : "opacity-30") : ""
              }`}
              style={
                wholeVerseHighlight
                  ? { backgroundColor: wholeVerseHighlight.color, textDecoration: wholeVerseHighlight.type === "subrayado" ? "underline" : undefined }
                  : query && matchesSearch
                    ? { backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }
                    : undefined
              }
            >
              <sup className="mr-1 select-none text-xs font-semibold text-primary">{v.verse_number}</sup>
              <span data-verse-text>
                {marks.length ? renderSegments(v.text, marks, setViewingAnnotation) : v.text}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    toggleFavorite({
                      bookId,
                      bookOrder,
                      chapterNumber,
                      verseStart: v.verse_number,
                      verseEnd: v.verse_number,
                      existingId: fav?.id ?? null,
                    })
                  )
                }
                className={`ml-2 inline-flex align-middle opacity-0 transition-opacity group-hover:opacity-100 disabled:animate-pulse disabled:opacity-100 ${fav ? "opacity-100" : ""}`}
                aria-label="Marcar como favorito"
              >
                <Star size={14} fill={fav ? "currentColor" : "none"} className={fav ? "text-amber-500" : "text-foreground/40"} />
              </button>
              {vComments.length > 0 && (
                <button
                  type="button"
                  onClick={() => onJumpToNotes?.()}
                  title={vComments.map((c) => c.content).join("\n\n")}
                  className="ml-1 inline-flex align-middle text-primary"
                  aria-label={`Ver ${vComments.length} comentario(s) en este versículo`}
                >
                  <MessageCircle size={14} fill="currentColor" className="text-primary/20" />
                </button>
              )}
              {vTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewingVerseTopics({ verseNumber: v.verse_number, topics: vTopics })}
                  title={vTopics.map((t) => t.topicName).join(", ")}
                  className="ml-1 inline-flex align-middle text-amber-600 dark:text-amber-400"
                  aria-label={`Ver temas de este versículo`}
                >
                  <Tag size={14} />
                </button>
              )}
              {vPersonalTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingVersePersonalTopics({ verseNumber: v.verse_number, topics: vPersonalTopics })
                  }
                  title={vPersonalTopics.map((t) => t.topicName).join(", ")}
                  className="ml-1 inline-flex align-middle text-indigo-600 dark:text-indigo-400"
                  aria-label="Ver mis etiquetas personales de este versículo"
                >
                  <Bookmark size={14} fill="currentColor" className="text-indigo-600/20 dark:text-indigo-400/20" />
                </button>
              )}
            </p>
          );
        })}
      </div>

      {commentFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setCommentFor(null)}>
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-medium">
              Comentario para: <span className="italic text-foreground/70">&ldquo;{commentFor.text}&rdquo;</span>
            </p>
            <textarea
              autoFocus
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
              placeholder="Escribe tu comentario..."
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setCommentFor(null)}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={saveComment}
                disabled={pending}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {publicNoteFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setPublicNoteFor(null)}>
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-medium">
              Nota pública para:{" "}
              <span className="italic text-foreground/70">&ldquo;{publicNoteFor.text}&rdquo;</span>
            </p>
            <p className="mb-2 text-xs text-foreground/50">
              Todos los usuarios podrán ver esta nota (se muestra con subrayado punteado).
            </p>
            <textarea
              autoFocus
              value={publicNoteText}
              onChange={(e) => setPublicNoteText(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
              placeholder='Ej. "en Reina Valera 1909 se le dice Adam a Adán"'
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setPublicNoteFor(null)}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={savePublicNote}
                disabled={pending}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Publicar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingAnnotation && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            setViewingAnnotation(null);
            setEditingAnnotation(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-medium">
              Nota pública sobre:{" "}
              <span className="italic text-foreground/70">&ldquo;{viewingAnnotation.quoted_text}&rdquo;</span>
            </p>
            {editingAnnotation ? (
              <textarea
                autoFocus
                value={annotationEditText}
                onChange={(e) => setAnnotationEditText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{viewingAnnotation.note}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              {isAdmin && !editingAnnotation && (
                <>
                  <button
                    onClick={deleteAnnotation}
                    disabled={pending}
                    className="mr-auto text-sm text-red-500 hover:underline disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => {
                      setAnnotationEditText(viewingAnnotation.note);
                      setEditingAnnotation(true);
                    }}
                    className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Editar
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setViewingAnnotation(null);
                  setEditingAnnotation(false);
                }}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
              >
                {editingAnnotation ? "Cancelar" : "Cerrar"}
              </button>
              {editingAnnotation && (
                <button
                  onClick={saveAnnotationEdit}
                  disabled={pending}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Guardar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tagFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setTagFor(null)}>
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-medium">
              Etiquetar: <span className="italic text-foreground/70">&ldquo;{tagFor.text}&rdquo;</span>
            </p>
            <input
              autoFocus
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Buscar o crear tema (ej. duelo, esperanza)"
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
              {allTopics
                .filter((t) => t.name.toLowerCase().includes(tagQuery.trim().toLowerCase()))
                .map((t) => (
                  <button
                    key={t.id}
                    disabled={pending}
                    onClick={() => applyTag(t.id)}
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    #{t.name} <span className="text-xs text-foreground/40">({t.verseCount})</span>
                  </button>
                ))}
              {tagQuery.trim() && !allTopics.some((t) => t.name.toLowerCase() === tagQuery.trim().toLowerCase()) && (
                <button
                  disabled={pending}
                  onClick={createAndApplyTag}
                  className="rounded-md border border-dashed border-border px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  Crear tema &ldquo;{tagQuery.trim()}&rdquo;
                </button>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setTagFor(null)} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingVerseTopics && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setViewingVerseTopics(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-medium">Temas de este versículo</p>
            <ul className="flex flex-col gap-2">
              {viewingVerseTopics.topics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                  <Link
                    href={`/temas/${t.topicSlug}`}
                    onClick={() => setViewingVerseTopics(null)}
                    className="font-medium text-primary hover:underline"
                  >
                    #{t.topicName}
                  </Link>
                  {isAdmin && (
                    <button
                      disabled={pending}
                      onClick={() => removeVerseTopic(t.id)}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setViewingVerseTopics(null)} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {personalTagFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setPersonalTagFor(null)}>
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-medium">
              Mi etiqueta para: <span className="italic text-foreground/70">&ldquo;{personalTagFor.text}&rdquo;</span>
            </p>
            <p className="mb-2 text-xs text-foreground/50">Solo tú puedes ver tus propias etiquetas.</p>
            <input
              autoFocus
              value={personalTagQuery}
              onChange={(e) => setPersonalTagQuery(e.target.value)}
              placeholder="Buscar o crear etiqueta (ej. para orar, releer)"
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
              {allPersonalTopics
                .filter((t) => t.name.toLowerCase().includes(personalTagQuery.trim().toLowerCase()))
                .map((t) => (
                  <button
                    key={t.id}
                    disabled={pending}
                    onClick={() => applyPersonalTag(t.id)}
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    #{t.name} <span className="text-xs text-foreground/40">({t.verseCount})</span>
                  </button>
                ))}
              {personalTagQuery.trim() &&
                !allPersonalTopics.some((t) => t.name.toLowerCase() === personalTagQuery.trim().toLowerCase()) && (
                  <button
                    disabled={pending}
                    onClick={createAndApplyPersonalTag}
                    className="rounded-md border border-dashed border-border px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    Crear etiqueta &ldquo;{personalTagQuery.trim()}&rdquo;
                  </button>
                )}
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setPersonalTagFor(null)} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingVersePersonalTopics && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setViewingVersePersonalTopics(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-medium">Mis etiquetas en este versículo</p>
            <ul className="flex flex-col gap-2">
              {viewingVersePersonalTopics.topics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">#{t.topicName}</span>
                  <button
                    disabled={pending}
                    onClick={() => removeVersePersonalTopic(t.id)}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setViewingVersePersonalTopics(null)}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderSegments(
  fullText: string,
  marks: Mark[],
  onAnnotationClick: (a: PublicAnnotation) => void
) {
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((m, i) => {
    const start = Math.max(m.start, cursor);
    const end = Math.max(m.end, start);
    if (start > cursor) pieces.push(fullText.slice(cursor, start));
    const content = fullText.slice(start, end);
    if (!content) return;
    if (m.kind === "highlight") {
      pieces.push(
        <mark
          key={m.id ?? i}
          style={{ backgroundColor: m.color, textDecoration: m.underline ? "underline" : undefined }}
          className="rounded-sm px-0.5"
        >
          {content}
        </mark>
      );
    } else {
      pieces.push(
        <button
          type="button"
          key={m.id ?? i}
          onClick={() => onAnnotationClick(m.annotation)}
          title={m.annotation.note}
          className="cursor-help border-b-2 border-dotted border-sky-500 font-normal text-inherit"
        >
          {content}
        </button>
      );
    }
    cursor = end;
  });
  if (cursor < fullText.length) pieces.push(fullText.slice(cursor));
  return pieces;
}

function closestVerseEl(node: Node): HTMLElement | null {
  let el: Node | null = node;
  while (el) {
    if (el instanceof HTMLElement && el.dataset.verse) return el;
    el = el.parentNode;
  }
  return null;
}

function SelectionToolbar({
  disabled,
  pending,
  isAdmin,
  canPublicNote,
  onColor,
  onUnderline,
  onComment,
  onPublicNote,
  onTag,
  onPersonalTag,
  onDismiss,
}: {
  disabled: boolean;
  pending: boolean;
  isAdmin: boolean;
  canPublicNote: boolean;
  onColor: (color: string) => void;
  onUnderline: () => void;
  onComment: () => void;
  onPublicNote: () => void;
  onTag: () => void;
  onPersonalTag: () => void;
  onDismiss: () => void;
}) {
  const actionsDisabled = disabled || pending;
  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-border bg-muted/60 p-1 pr-2 mr-1 transition-all ${
        disabled ? "opacity-40" : "opacity-100"
      } ${pending ? "animate-pulse" : ""}`}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          disabled={actionsDisabled}
          title={`Resaltar en ${c.label.toLowerCase()}`}
          onClick={() => onColor(c.value)}
          className="h-6 w-6 rounded-full border border-black/10 disabled:pointer-events-none disabled:cursor-wait"
          style={{ backgroundColor: c.value }}
        />
      ))}
      <div className="mx-1 h-6 w-px bg-border" />
      <button
        onClick={onUnderline}
        disabled={actionsDisabled}
        title="Subrayar"
        className="rounded px-2 py-1 text-sm font-semibold underline hover:bg-muted disabled:pointer-events-none disabled:cursor-wait"
      >
        U
      </button>
      <button
        onClick={onComment}
        disabled={actionsDisabled}
        title="Agregar comentario"
        className="rounded px-2 py-1 text-sm hover:bg-muted disabled:pointer-events-none disabled:cursor-wait"
      >
        💬
      </button>
      {isAdmin && canPublicNote && (
        <button
          onClick={onPublicNote}
          disabled={pending}
          title="Agregar nota pública (visible para todos)"
          className="rounded px-2 py-1 text-sm hover:bg-muted disabled:pointer-events-none disabled:cursor-wait"
        >
          📌
        </button>
      )}
      {isAdmin && (
        <button
          onClick={onTag}
          disabled={actionsDisabled}
          title="Etiquetar por tema (ej. duelo, esperanza)"
          className="rounded px-2 py-1 text-sm hover:bg-muted disabled:pointer-events-none disabled:cursor-wait"
        >
          🏷️
        </button>
      )}
      <button
        onClick={onPersonalTag}
        disabled={actionsDisabled}
        title="Mi etiqueta personal (solo tú la ves)"
        className="rounded px-2 py-1 text-sm hover:bg-muted disabled:pointer-events-none disabled:cursor-wait"
      >
        🔖
      </button>
      {!disabled && (
        <button onClick={onDismiss} title="Cerrar" className="rounded px-2 py-1 text-sm hover:bg-muted">
          ✕
        </button>
      )}
    </div>
  );
}
