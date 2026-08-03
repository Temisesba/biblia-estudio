"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ReadingProgress,
  SectionTitle,
} from "@/types/database";
import type { ChapterTopicsMap } from "@/lib/data/topics";
import type { ChapterPersonalTopicsMap } from "@/lib/data/personal-topics";
import { HIGHLIGHT_COLORS, DEFAULT_COLOR, UNDERLINE_COLOR } from "@/lib/highlight-colors";
import { createHighlight, deleteHighlight, toggleFavorite, createNote, markChapterRead } from "@/lib/actions/study";
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
import { upsertSectionTitle, deleteSectionTitle } from "@/lib/actions/section-titles";
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
  sectionTitles,
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
  jumpToVerse,
  progress,
}: {
  verses: Verse[];
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  sectionTitles: SectionTitle[];
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
  progress?: ReadingProgress | null;
  onJumpToNotes?: () => void;
  jumpToVerse?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [optimisticHighlights, addOptimisticHighlight] = useOptimistic<Highlight[], Highlight>(
    highlights,
    (state, newHighlight) => [...state, newHighlight]
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [commentFor, setCommentFor] = useState<Selection | null>(null);
  const [commentText, setCommentText] = useState("");
  const [publicNoteFor, setPublicNoteFor] = useState<Selection | null>(null);
  const [publicNoteText, setPublicNoteText] = useState("");
  const [viewingAnnotation, setViewingAnnotation] = useState<PublicAnnotation | null>(null);
  const [viewingHighlightId, setViewingHighlightId] = useState<string | null>(null);
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
  const [flashVerse, setFlashVerse] = useState<number | null>(null);
  const [editingTitleVerse, setEditingTitleVerse] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [editTitlesMode, setEditTitlesMode] = useState(false);
  const sectionTitleByVerse = new Map(sectionTitles.map((s) => [s.verse_number, s]));

  function openTitleEditor(verseNumber: number) {
    setEditingTitleVerse(verseNumber);
    setTitleDraft(sectionTitleByVerse.get(verseNumber)?.title ?? "");
  }

  function saveTitleEditor() {
    if (editingTitleVerse === null) return;
    const trimmed = titleDraft.trim();
    const verseNumber = editingTitleVerse;
    startTransition(async () => {
      if (trimmed) {
        await upsertSectionTitle({ bookId, bookOrder, chapterNumber, verseNumber, title: trimmed });
      } else {
        const existing = sectionTitleByVerse.get(verseNumber);
        if (existing) await deleteSectionTitle(existing.id, bookOrder, chapterNumber);
      }
      setEditingTitleVerse(null);
    });
  }
  const searchParams = useSearchParams();

  function scrollAndFlash(target: number) {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-verse="${target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashVerse(target);
    setTimeout(() => setFlashVerse((cur) => (cur === target ? null : cur)), 2000);
  }

  useEffect(() => {
    const target = Number(searchParams.get("v"));
    if (!target || Number.isNaN(target)) return;
    scrollAndFlash(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (jumpToVerse == null) return;
    scrollAndFlash(jumpToVerse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToVerse]);

  function updateSelectionFromDOM() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

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

  // En móvil, seleccionar texto no siempre dispara "mouseup" (se arma con
  // toques + manijas de arrastre), pero "selectionchange" si se dispara
  // siempre que cambia la seleccion real del navegador.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onSelectionChange() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(updateSelectionFromDOM, 150);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function applyHighlight(type: "resaltado" | "subrayado", color: string) {
    if (!selection) return;
    const optimisticEntry: Highlight = {
      id: `optimistic-${Date.now()}`,
      user_id: "",
      book_id: bookId,
      chapter_number: chapterNumber,
      verse_start: selection.verseStart,
      verse_end: selection.verseEnd,
      char_start: selection.charStart,
      char_end: selection.charEnd,
      selected_text: selection.text,
      type,
      color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    startTransition(async () => {
      addOptimisticHighlight(optimisticEntry);
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
    return optimisticHighlights.filter((h) => verseNumber >= h.verse_start && verseNumber <= h.verse_end);
  }

  function commentsFor(verseNumber: number) {
    return notes.filter((n) => n.verse_number === verseNumber);
  }

  function annotationsFor(verseNumber: number) {
    return publicAnnotations.filter((a) => a.verse_number === verseNumber);
  }

  const toolbarSlot = typeof document !== "undefined" ? document.getElementById("selection-toolbar-slot") : null;

  return (
    <div className="relative" ref={containerRef} onMouseUp={updateSelectionFromDOM}>
      {toolbarSlot &&
        createPortal(
          <SelectionToolbar
            disabled={!selection}
            pending={pending}
            isAdmin={isAdmin}
            canPublicNote={!!selection && selection.verseStart === selection.verseEnd && selection.charStart !== null}
            onColor={(color) => applyHighlight("resaltado", color)}
            onUnderline={() => applyHighlight("subrayado", UNDERLINE_COLOR)}
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

      {isAdmin && (
        <button
          type="button"
          onClick={() => setEditTitlesMode((m) => !m)}
          className={`mb-2 self-start rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted ${
            editTitlesMode ? "bg-muted font-medium" : ""
          }`}
        >
          ✏️ {editTitlesMode ? "Terminar de editar títulos" : "Editar títulos de sección"}
        </button>
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
          const sectionTitle = sectionTitleByVerse.get(v.verse_number);

          return (
            <div key={v.id} className="contents">
              {(sectionTitle || (isAdmin && editTitlesMode)) &&
                (editingTitleVerse === v.verse_number ? (
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveTitleEditor()}
                      placeholder="Título de sección"
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold outline-none focus:border-primary"
                    />
                    <button onClick={saveTitleEditor} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                      Guardar
                    </button>
                    <button onClick={() => setEditingTitleVerse(null)} className="rounded-md px-2 py-1 text-xs hover:bg-muted">
                      Cancelar
                    </button>
                  </div>
                ) : sectionTitle ? (
                  <div className="mt-4 flex items-center gap-2 group/title">
                    <h3 className="text-lg font-semibold">{sectionTitle.title}</h3>
                    {isAdmin && editTitlesMode && (
                      <button
                        onClick={() => openTitleEditor(v.verse_number)}
                        className="text-xs text-foreground/40 opacity-0 hover:text-foreground group-hover/title:opacity-100"
                      >
                        editar
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openTitleEditor(v.verse_number)}
                    className="mt-4 self-start text-xs text-foreground/40 hover:text-primary"
                  >
                    + Añadir título aquí
                  </button>
                ))}
              <p
                data-verse={v.verse_number}
              className={`group relative rounded px-2 py-0.5 hover:bg-muted/60 transition-all duration-700 ${
                query ? (matchesSearch ? "" : "opacity-30") : ""
              } ${flashVerse === v.verse_number ? "bg-primary/25" : ""}`}
              style={
                wholeVerseHighlight
                  ? wholeVerseHighlight.type === "subrayado"
                    ? { textDecorationLine: "underline", textDecorationColor: wholeVerseHighlight.color, textDecorationThickness: "2px" }
                    : { backgroundColor: wholeVerseHighlight.color }
                  : query && matchesSearch
                    ? { backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }
                    : undefined
              }
            >
              <sup className="mr-1 select-none text-xs font-semibold text-primary">{v.verse_number}</sup>
              <span data-verse-text>
                {marks.length ? renderSegments(v.text, marks, setViewingAnnotation, setViewingHighlightId) : v.text}
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
                className={`ml-2 inline-flex align-middle transition-opacity disabled:animate-pulse disabled:opacity-100 ${
                  fav ? "opacity-100" : "opacity-40 hover:opacity-100"
                }`}
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
            </div>
          );
        })}
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-md border border-border p-4 text-sm">
        <input
          type="checkbox"
          checked={progress?.status === "terminado"}
          disabled={pending}
          onChange={() => startTransition(() => markChapterRead(bookOrder, chapterNumber))}
          className="h-5 w-5 accent-[var(--primary)]"
        />
        <span className="font-medium">Marcar este capítulo como leído</span>
      </label>

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

      {viewingHighlightId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setViewingHighlightId(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm text-foreground/70">¿Quitar este resaltado o subrayado?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setViewingHighlightId(null)} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = viewingHighlightId;
                  startTransition(async () => {
                    await deleteHighlight(id, bookOrder, chapterNumber);
                    setViewingHighlightId(null);
                  });
                }}
                disabled={pending}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Quitar
              </button>
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
  onAnnotationClick: (a: PublicAnnotation) => void,
  onHighlightClick: (id: string) => void
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
        <button
          type="button"
          key={m.id ?? i}
          onClick={() => onHighlightClick(m.id)}
          style={{
            font: "inherit",
            ...(m.underline
              ? { textDecorationLine: "underline", textDecorationColor: m.color, textDecorationThickness: "2px" }
              : { backgroundColor: m.color }),
          }}
          className="inline cursor-pointer appearance-none border-0 bg-transparent p-0 align-baseline text-inherit"
        >
          {content}
        </button>
      );
    } else {
      pieces.push(
        <button
          type="button"
          key={m.id ?? i}
          onClick={() => onAnnotationClick(m.annotation)}
          title={m.annotation.note}
          style={{ font: "inherit" }}
          className="inline cursor-help appearance-none border-0 border-b-2 border-dotted border-sky-500 bg-transparent p-0 align-baseline text-inherit"
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
  const [activeColor, setActiveColor] = useState<string>(DEFAULT_COLOR);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const activeColorMeta = HIGHLIGHT_COLORS.find((c) => c.value === activeColor) ?? HIGHLIGHT_COLORS[0];

  function pickColor(color: string) {
    setActiveColor(color);
    setColorMenuOpen(false);
    onColor(color);
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-border bg-muted/60 p-1 pr-2 mr-1 transition-all ${
        disabled ? "opacity-40" : "opacity-100"
      } ${pending ? "animate-pulse" : ""}`}
    >
      <div className="relative flex items-center">
        <button
          disabled={actionsDisabled}
          title={`Resaltar en ${activeColorMeta.label.toLowerCase()}`}
          onClick={() => pickColor(activeColor)}
          className="h-6 w-6 rounded-full border border-black/10 disabled:pointer-events-none disabled:cursor-wait"
          style={{ backgroundColor: activeColor }}
        />
        <button
          disabled={actionsDisabled}
          title="Elegir otro color"
          onClick={() => setColorMenuOpen((o) => !o)}
          className="px-0.5 text-[10px] text-foreground/60 hover:text-foreground disabled:pointer-events-none"
        >
          ▾
        </button>
        {colorMenuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setColorMenuOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-2 flex gap-1 rounded-md border border-border bg-background p-1.5 shadow-lg">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={`Resaltar en ${c.label.toLowerCase()}`}
                  onClick={() => pickColor(c.value)}
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </>
        )}
      </div>
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
