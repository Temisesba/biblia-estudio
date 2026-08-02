"use client";

import { useTransition } from "react";
import type { ReadingProgress } from "@/types/database";
import { markChapterRead } from "@/lib/actions/study";

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
  const done = progress?.status === "terminado";

  return (
    <div className="flex flex-col gap-4 py-6">
      <label className="flex items-center gap-3 rounded-md border border-border p-4">
        <input
          type="checkbox"
          checked={done}
          disabled={pending}
          onChange={() => startTransition(() => markChapterRead(bookOrder, chapterNumber))}
          className="h-5 w-5 accent-[var(--primary)]"
        />
        <span className="font-medium">Marcar este capítulo como leído</span>
      </label>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Stat label="Estado" value={statusLabel(progress?.status)} />
        <Stat label="Veces leído" value={String(progress?.times_read ?? 0)} />
        <Stat
          label="Primera lectura"
          value={progress?.first_read_at ? new Date(progress.first_read_at).toLocaleDateString("es-MX") : "—"}
        />
        <Stat
          label="Última lectura"
          value={progress?.last_read_at ? new Date(progress.last_read_at).toLocaleString("es-MX") : "—"}
        />
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
