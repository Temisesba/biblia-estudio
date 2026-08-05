"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import type { ChapterContext, ContextHighlight, ContextFavorite } from "@/types/database";
import { saveChapterContext } from "@/lib/actions/context";
import {
  createContextHighlight,
  deleteContextHighlight,
  toggleContextFavorite,
} from "@/lib/actions/context-study";
import { parseContextPaste } from "@/lib/parse-context-paste";
import { HIGHLIGHT_COLORS, DEFAULT_COLOR, UNDERLINE_COLOR } from "@/lib/highlight-colors";

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

interface FieldSelection {
  fieldKey: string;
  charStart: number;
  charEnd: number;
  text: string;
}

export function ContextPanel({
  bookId,
  bookOrder,
  chapterNumber,
  context,
  highlights,
  favorites,
  isAdmin,
  jumpToField,
  topics,
}: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  context: ChapterContext | null;
  highlights: ContextHighlight[];
  favorites: ContextFavorite[];
  isAdmin: boolean;
  jumpToField?: { key: string; token: number } | null;
  topics: { topicName: string; topicSlug: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [innerTab, setInnerTab] = useState<InnerTab>("desglose");
  const [flashField, setFlashField] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(ALL_FIELDS.map((f) => [f.key, (context?.[f.key] as string) ?? ""]))
  );
  const [pending, startTransition] = useTransition();
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [optimisticHighlights, updateOptimisticHighlights] = useOptimistic<
    ContextHighlight[],
    { type: "add"; highlight: ContextHighlight } | { type: "remove"; id: string }
  >(highlights, (state, action) =>
    action.type === "add" ? [...state, action.highlight] : state.filter((h) => h.id !== action.id)
  );
  const [optimisticFavorites, updateOptimisticFavorites] = useOptimistic<
    ContextFavorite[],
    { type: "add"; favorite: ContextFavorite } | { type: "remove"; id: string }
  >(favorites, (state, action) =>
    action.type === "add" ? [...state, action.favorite] : state.filter((f) => f.id !== action.id)
  );
  const [selection, setSelection] = useState<FieldSelection | null>(null);
  const [viewingHighlightId, setViewingHighlightId] = useState<string | null>(null);

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

    const startFieldEl = closestFieldEl(range.startContainer);
    const endFieldEl = closestFieldEl(range.endContainer);
    if (!startFieldEl || !endFieldEl || startFieldEl !== endFieldEl) {
      setSelection(null);
      return;
    }
    const fieldKey = startFieldEl.dataset.field as string;
    const textNode = startFieldEl.querySelector("[data-field-text]");
    const full = textNode?.textContent ?? "";
    const idx = full.indexOf(text);
    if (idx < 0) {
      setSelection(null);
      return;
    }
    setSelection({ fieldKey, charStart: idx, charEnd: idx + text.length, text });
  }

  useEffect(() => {
    if (editing) return;
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
  }, [editing]);

  const searchParams = useSearchParams();

  function jumpToFieldKey(fieldKey: string) {
    setInnerTab(fieldKey === "explanation" ? "narrativa" : "desglose");
    // Espera a que el cambio de pestaña interna pinte el campo antes de buscarlo en el DOM.
    const timer = setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-field="${fieldKey}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashField(fieldKey);
      setTimeout(() => setFlashField((cur) => (cur === fieldKey ? null : cur)), 2000);
    }, 50);
    return () => clearTimeout(timer);
  }

  // Salto disparado desde "Mis notas" (misma sesion, sin recargar la URL).
  useEffect(() => {
    if (!jumpToField) return;
    return jumpToFieldKey(jumpToField.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToField]);

  // Salto disparado al llegar directo desde "Mi estudio" con ?tab=contexto&field=X en la URL.
  useEffect(() => {
    const field = searchParams.get("field");
    if (!field) return;
    return jumpToFieldKey(field);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function applyHighlight(type: "resaltado" | "subrayado", color: string) {
    if (!selection) return;
    const optimisticEntry: ContextHighlight = {
      id: `optimistic-${Date.now()}`,
      user_id: "",
      book_id: bookId,
      chapter_number: chapterNumber,
      field_key: selection.fieldKey,
      char_start: selection.charStart,
      char_end: selection.charEnd,
      selected_text: selection.text,
      type,
      color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const fieldKey = selection.fieldKey;
    const charStart = selection.charStart;
    const charEnd = selection.charEnd;
    const text = selection.text;
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    startTransition(async () => {
      updateOptimisticHighlights({ type: "add", highlight: optimisticEntry });
      await createContextHighlight({
        bookId,
        bookOrder,
        chapterNumber,
        fieldKey,
        charStart,
        charEnd,
        selectedText: text,
        type,
        color,
      });
    });
  }

  function favoriteFor(fieldKey: string) {
    return optimisticFavorites.find((f) => f.field_key === fieldKey);
  }

  function toggleFieldFavorite(fieldKey: string) {
    const fav = favoriteFor(fieldKey);
    const existingId = fav?.id ?? null;
    startTransition(async () => {
      if (existingId) {
        updateOptimisticFavorites({ type: "remove", id: existingId });
      } else {
        updateOptimisticFavorites({
          type: "add",
          favorite: {
            id: `optimistic-${Date.now()}`,
            user_id: "",
            book_id: bookId,
            chapter_number: chapterNumber,
            field_key: fieldKey,
            created_at: new Date().toISOString(),
          },
        });
      }
      await toggleContextFavorite({ bookId, bookOrder, chapterNumber, fieldKey, existingId });
    });
  }

  function highlightsFor(fieldKey: string) {
    return optimisticHighlights.filter((h) => h.field_key === fieldKey);
  }

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

  const toolbarSlot = typeof document !== "undefined" ? document.getElementById("selection-toolbar-slot") : null;

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
    <div className="flex flex-col gap-4 py-4" ref={containerRef} onMouseUp={updateSelectionFromDOM}>
      {toolbarSlot &&
        !editing &&
        createPortal(
          <ContextSelectionToolbar
            disabled={!selection}
            pending={pending}
            onColor={(color) => applyHighlight("resaltado", color)}
            onUnderline={() => applyHighlight("subrayado", UNDERLINE_COLOR)}
            onDismiss={() => {
              window.getSelection()?.removeAllRanges();
              setSelection(null);
            }}
          />,
          toolbarSlot
        )}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-border">
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
              <div
                data-field="explanation"
                className={`rounded-md transition-colors duration-700 ${flashField === "explanation" ? "bg-primary/15" : ""}`}
              >
                <div className="mb-1 flex justify-end">
                  <FavoriteStarButton
                    active={!!favoriteFor("explanation")}
                    onToggle={() => toggleFieldFavorite("explanation")}
                  />
                </div>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/60 p-4 text-sm leading-relaxed text-foreground/90">
                  <FieldText
                    value={context.explanation}
                    marks={highlightsFor("explanation").map(toMark)}
                    onHighlightClick={setViewingHighlightId}
                  />
                </p>
              </div>
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
                  <section
                    key={f.key}
                    data-field={f.key}
                    className={`rounded-md transition-colors duration-700 ${flashField === f.key ? "bg-primary/15" : ""}`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-primary">{f.label}</h3>
                      <FavoriteStarButton
                        active={!!favoriteFor(f.key)}
                        onToggle={() => toggleFieldFavorite(f.key)}
                      />
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      <FieldText
                        value={value}
                        marks={highlightsFor(f.key).map(toMark)}
                        onHighlightClick={setViewingHighlightId}
                      />
                    </p>
                  </section>
                );
              })}
              {DESGLOSE_FIELDS.every((f) => !context?.[f.key]) && (
                <p className="py-4 text-sm text-foreground/50">Aún no hay desglose para este capítulo.</p>
              )}
            </div>
          )}

          {topics.length > 0 && (
            <div className="mt-2 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground/60">Temas de este capítulo</h3>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <Link
                    key={t.topicSlug}
                    href={`/temas/${t.topicSlug}`}
                    className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/25"
                  >
                    #{t.topicName}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
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
                  setViewingHighlightId(null);
                  startTransition(async () => {
                    updateOptimisticHighlights({ type: "remove", id });
                    await deleteContextHighlight(id, bookOrder, chapterNumber);
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
    </div>
  );
}

interface FieldMark {
  start: number;
  end: number;
  color: string;
  underline: boolean;
  id: string;
}

function toMark(h: ContextHighlight): FieldMark {
  return { start: h.char_start, end: h.char_end, color: h.color, underline: h.type === "subrayado", id: h.id };
}

function FavoriteStarButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex align-middle transition-opacity ${
        active ? "opacity-100" : "opacity-40 hover:opacity-100"
      }`}
      aria-label="Marcar esta sección como favorita"
    >
      <Star size={14} fill={active ? "currentColor" : "none"} className={active ? "text-amber-500" : "text-foreground/40"} />
    </button>
  );
}

function FieldText({
  value,
  marks,
  onHighlightClick,
}: {
  value: string;
  marks: FieldMark[];
  onHighlightClick: (id: string) => void;
}) {
  return <span data-field-text>{marks.length ? renderFieldMarks(value, marks, onHighlightClick) : value}</span>;
}

function renderFieldMarks(
  fullText: string,
  marks: { start: number; end: number; color: string; underline: boolean; id: string }[],
  onClick: (id: string) => void
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
    pieces.push(
      <span
        key={m.id ?? i}
        role="button"
        tabIndex={0}
        onClick={() => onClick(m.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(m.id);
          }
        }}
        style={
          m.underline
            ? { textDecorationLine: "underline", textDecorationColor: m.color, textDecorationThickness: "2px" }
            : { backgroundColor: m.color }
        }
        className="cursor-pointer"
      >
        {content}
      </span>
    );
    cursor = end;
  });
  if (cursor < fullText.length) pieces.push(fullText.slice(cursor));
  return pieces;
}

function closestFieldEl(node: Node): HTMLElement | null {
  let el: Node | null = node;
  while (el) {
    if (el instanceof HTMLElement && el.dataset.field) return el;
    el = el.parentNode;
  }
  return null;
}

function ContextSelectionToolbar({
  disabled,
  pending,
  onColor,
  onUnderline,
  onDismiss,
}: {
  disabled: boolean;
  pending: boolean;
  onColor: (color: string) => void;
  onUnderline: () => void;
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
      {!disabled && (
        <button onClick={onDismiss} title="Cerrar" className="rounded px-2 py-1 text-sm hover:bg-muted">
          ✕
        </button>
      )}
    </div>
  );
}
