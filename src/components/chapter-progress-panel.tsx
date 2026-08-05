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
  const [pending, startTransition] = useTransition();
  const [optimisticEvents, removeOptimisticEvent] = useOptimistic<ReadingEvent[], string>(
    readingEvents,
    (state, id) => state.filter((e) => e.id !== id)
  );
  const done = progress?.status === "terminado" && !!progress?.last_read_at;

  function markFirstRead() {
    startTransition(() => markChapterRead(bookOrder, chapterNumber));
  }

  function unmarkLastRead() {
    startTransition(() => removeLastReadingEvent(bookOrder, chapterNumber));
  }

  function leerOtraVez() {
    startTransition(() => markChapterRead(bookOrder, chapterNumber));
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
                disabled={pending}
                onChange={unmarkLastRead}
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span className="font-medium">
                Leído última vez: {new Date(progress!.last_read_at as string).toLocaleString("es-MX")}
              </span>
            </label>
            <button
              type="button"
              onClick={leerOtraVez}
              disabled={pending}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              🔁 Leído otra vez
            </button>
          </>
        ) : (
          <label className="flex items-center gap-3 rounded-md border border-border p-4">
            <input
              type="checkbox"
              checked={false}
              disabled={pending}
              onChange={markFirstRead}
              className="h-5 w-5 accent-[var(--primary)]"
            />
            <span className="font-medium">Marcar este capítulo como leído</span>
          </label>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
        <Stat label="Estado" value={statusLabel(progress?.status)} />
        <Stat label="Veces leído" value={String(progress?.times_read ?? 0)} />
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
