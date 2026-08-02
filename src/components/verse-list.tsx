"use client";

import { useRef, useState, useTransition } from "react";
import type { Verse, Highlight, Favorite } from "@/types/database";
import { HIGHLIGHT_COLORS, DEFAULT_COLOR } from "@/lib/highlight-colors";
import { createHighlight, deleteHighlight, toggleFavorite, createNote } from "@/lib/actions/study";
import { Star } from "lucide-react";

interface Selection {
  verseStart: number;
  verseEnd: number;
  charStart: number | null;
  charEnd: number | null;
  text: string;
  x: number;
  y: number;
}

export function VerseList({
  verses,
  bookId,
  bookOrder,
  chapterNumber,
  highlights,
  favorites,
}: {
  verses: Verse[];
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  highlights: Highlight[];
  favorites: Favorite[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [commentFor, setCommentFor] = useState<Selection | null>(null);
  const [commentText, setCommentText] = useState("");
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

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setSelection({
      verseStart: Math.min(verseStart, verseEnd),
      verseEnd: Math.max(verseStart, verseEnd),
      charStart,
      charEnd,
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
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
        content: commentText.trim(),
      });
      window.getSelection()?.removeAllRanges();
      setCommentFor(null);
      setCommentText("");
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

  return (
    <div className="relative" ref={containerRef} onMouseUp={handleMouseUp}>
      {selection && (
        <SelectionToolbar
          selection={selection}
          onColor={(color) => applyHighlight("resaltado", color)}
          onUnderline={() => applyHighlight("subrayado", DEFAULT_COLOR)}
          onComment={openComment}
          onDismiss={() => {
            window.getSelection()?.removeAllRanges();
            setSelection(null);
          }}
        />
      )}

      <div className="verse-text flex flex-col gap-0.5">
        {verses.map((v) => {
          const vHighlights = highlightsFor(v.verse_number);
          const fav = favoriteFor(v.verse_number);
          const wholeVerseHighlight = vHighlights.find((h) => h.char_start === null);
          const partial = vHighlights.filter((h) => h.char_start !== null && h.verse_start === h.verse_end);

          return (
            <p
              key={v.id}
              data-verse={v.verse_number}
              className="group relative rounded px-2 py-0.5 hover:bg-muted/60"
              style={wholeVerseHighlight ? { backgroundColor: wholeVerseHighlight.color, textDecoration: wholeVerseHighlight.type === "subrayado" ? "underline" : undefined } : undefined}
            >
              <sup className="mr-1 select-none text-xs font-semibold text-primary">{v.verse_number}</sup>
              <span data-verse-text>
                {partial.length ? renderPartial(v.text, partial) : v.text}
              </span>
              <button
                type="button"
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
                className={`ml-2 inline-flex align-middle opacity-0 transition-opacity group-hover:opacity-100 ${fav ? "opacity-100" : ""}`}
                aria-label="Marcar como favorito"
              >
                <Star size={14} fill={fav ? "currentColor" : "none"} className={fav ? "text-amber-500" : "text-foreground/40"} />
              </button>
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
    </div>
  );
}

function renderPartial(fullText: string, partials: Highlight[]) {
  const sorted = [...partials].sort((a, b) => (a.char_start ?? 0) - (b.char_start ?? 0));
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((h, i) => {
    const start = h.char_start ?? 0;
    const end = h.char_end ?? start;
    if (start > cursor) pieces.push(fullText.slice(cursor, start));
    pieces.push(
      <mark
        key={h.id ?? i}
        style={{ backgroundColor: h.color, textDecoration: h.type === "subrayado" ? "underline" : undefined }}
        className="rounded-sm px-0.5"
      >
        {fullText.slice(start, end)}
      </mark>
    );
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
  selection,
  onColor,
  onUnderline,
  onComment,
  onDismiss,
}: {
  selection: Selection;
  onColor: (color: string) => void;
  onUnderline: () => void;
  onComment: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border border-border bg-background p-1.5 shadow-lg"
      style={{ left: selection.x, top: Math.max(selection.y - 8, 0) }}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          title={`Resaltar en ${c.label.toLowerCase()}`}
          onClick={() => onColor(c.value)}
          className="h-6 w-6 rounded-full border border-black/10"
          style={{ backgroundColor: c.value }}
        />
      ))}
      <div className="mx-1 h-6 w-px bg-border" />
      <button
        onClick={onUnderline}
        title="Subrayar"
        className="rounded px-2 py-1 text-sm font-semibold underline hover:bg-muted"
      >
        U
      </button>
      <button onClick={onComment} title="Agregar comentario" className="rounded px-2 py-1 text-sm hover:bg-muted">
        💬
      </button>
      <button onClick={onDismiss} title="Cerrar" className="rounded px-2 py-1 text-sm hover:bg-muted">
        ✕
      </button>
    </div>
  );
}
