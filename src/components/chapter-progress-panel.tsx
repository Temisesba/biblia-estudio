"use client";

import { useState, useTransition } from "react";
import type { ReadingProgress } from "@/types/database";
import { markChapterRead, removeLastReadingEvent, updateReadingProgressDate } from "@/lib/actions/study";

function toDateInputValue(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function ChapterProgressPanel({
  bookOrder,
  chapterNumber,
  progress,
}: {
  bookOrder: number;
  chapterNumber: number;
  progress: ReadingProgress | null;
}) {
  const [pending, startTransition] = useTransition();
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState(progress?.first_read_at ? toDateInputValue(progress.first_read_at) : "");
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

  function saveDate() {
    if (!dateDraft) return;
    startTransition(async () => {
      await updateReadingProgressDate(bookOrder, chapterNumber, dateDraft);
      setEditingDate(false);
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
                Leído última vez: {new Date(progress!.last_read_at as string).toLocaleDateString("es-MX")}
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

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Stat label="Estado" value={statusLabel(progress?.status)} />
        <Stat label="Veces leído" value={String(progress?.times_read ?? 0)} />
        <div className="rounded-md bg-muted p-3">
          <dt className="text-xs text-foreground/50">Primera lectura</dt>
          {editingDate ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
              />
              <button
                onClick={saveDate}
                disabled={pending}
                className="shrink-0 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingDate(false)}
                className="shrink-0 text-xs text-foreground/50 hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <dd className="flex items-center gap-2 font-semibold">
              {progress?.first_read_at ? new Date(progress.first_read_at).toLocaleDateString("es-MX") : "—"}
              {progress?.first_read_at && (
                <button
                  onClick={() => {
                    setDateDraft(toDateInputValue(progress.first_read_at as string));
                    setEditingDate(true);
                  }}
                  title="Corregir fecha"
                  className="text-xs font-normal text-primary hover:underline"
                >
                  editar
                </button>
              )}
            </dd>
          )}
        </div>
      </dl>
    </div>
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
