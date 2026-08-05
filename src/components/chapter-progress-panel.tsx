"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ReadingProgress, ReadingEvent } from "@/types/database";
import { markChapterRead, removeLastReadingEvent, updateReadingEventDate, deleteReadingEvent } from "@/lib/actions/study";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

function toDateTimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ChapterProgressPanel({
  bookOrder,
  chapterNumber,
  progress,
  readingEvents,
}: {
  bookOrder: number;
  chapterNumber: number;
  progress: ReadingProgress | null;
  readingEvents: ReadingEvent[];
}) {
  const [, startTransition] = useTransition();
  const [optimisticEvents, removeOptimisticEvent] = useOptimistic<ReadingEvent[], string>(
    readingEvents,
    (state, id) => state.filter((e) => e.id !== id)
  );
  // Sin esto, la casilla se quedaba "colgada" hasta que el servidor terminara (varios
  // viajes de red) -- ahora refleja el cambio al instante y el servidor la confirma despues.
  const [optimisticProgress, updateOptimisticProgress] = useOptimistic<
    ReadingProgress | null,
    "mark" | "unmark"
  >(progress, (state, action) => {
    const now = new Date().toISOString();
    if (action === "mark") {
      return {
        id: state?.id ?? "optimistic",
        user_id: state?.user_id ?? "",
        book_id: state?.book_id ?? 0,
        chapter_number: chapterNumber,
        status: "terminado",
        times_read: (state?.times_read ?? 0) + 1,
        first_read_at: state?.first_read_at ?? now,
        last_read_at: now,
      };
    }
    return state ? { ...state, status: "pendiente" } : state;
  });
  const done = optimisticProgress?.status === "terminado" && !!optimisticProgress?.last_read_at;

  function markFirstRead() {
    startTransition(async () => {
      updateOptimisticProgress("mark");
      await markChapterRead(bookOrder, chapterNumber);
    });
  }

  function unmarkLastRead() {
    startTransition(async () => {
      updateOptimisticProgress("unmark");
      await removeLastReadingEvent(bookOrder, chapterNumber);
    });
  }

  function leerOtraVez() {
    startTransition(async () => {
      updateOptimisticProgress("mark");
      await markChapterRead(bookOrder, chapterNumber);
    });
  }

  function deleteEvent(id: string) {
    startTransition(async () => {
      removeOptimisticEvent(id);
      await deleteReadingEvent(id, bookOrder, chapterNumber);
    });
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        {done ? (
          <>
            <label className="flex items-center gap-3 rounded-md border border-border p-4">
              <input
                type="checkbox"
                checked
                onChange={unmarkLastRead}
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span className="font-medium">
                Leído última vez: {new Date(optimisticProgress!.last_read_at as string).toLocaleString("es-MX")}
              </span>
            </label>
            <button
              type="button"
              onClick={leerOtraVez}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              🔁 Leído otra vez
            </button>
          </>
        ) : (
          <label className="flex items-center gap-3 rounded-md border border-border p-4">
            <input
              type="checkbox"
              checked={false}
              onChange={markFirstRead}
              className="h-5 w-5 accent-[var(--primary)]"
            />
            <span className="font-medium">Marcar este capítulo como leído</span>
          </label>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
        <Stat label="Estado" value={statusLabel(optimisticProgress?.status)} />
        <Stat label="Veces leído" value={String(optimisticProgress?.times_read ?? 0)} />
      </dl>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Historial de lecturas ({optimisticEvents.length})</h3>
        {optimisticEvents.length === 0 ? (
          <p className="text-sm text-foreground/50">Todavía no hay lecturas registradas para este capítulo.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {optimisticEvents.map((ev) => (
              <ReadingEventRow
                key={ev.id}
                event={ev}
                bookOrder={bookOrder}
                chapterNumber={chapterNumber}
                onDelete={() => deleteEvent(ev.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReadingEventRow({
  event,
  bookOrder,
  chapterNumber,
  onDelete,
}: {
  event: ReadingEvent;
  bookOrder: number;
  chapterNumber: number;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(toDateTimeInputValue(event.read_at));
  const [pending, startTransition] = useTransition();

  function save() {
    if (!draft) return;
    // new Date(draft) corre aqui en el navegador, asi que "draft" (sin zona horaria) se
    // interpreta en la hora local del usuario -- toISOString() ya manda un instante sin
    // ambiguedad al servidor, para que no dependa de en que zona horaria corre Vercel.
    const iso = new Date(draft).toISOString();
    startTransition(async () => {
      await updateReadingEventDate(event.id, bookOrder, chapterNumber, iso);
      setEditing(false);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm">
      {editing ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
          />
          <button
            onClick={save}
            disabled={pending}
            className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-foreground/50 hover:underline">
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <span>{new Date(event.read_at).toLocaleString("es-MX")}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
              Editar
            </button>
            <ConfirmDeleteButton onConfirm={onDelete} />
          </div>
        </>
      )}
    </li>
  );
}

function statusLabel(status?: string) {
  if (status === "terminado") return "Terminado";
  if (status === "iniciado") return "Iniciado";
  return "Pendiente";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <dt className="text-xs text-foreground/50">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
