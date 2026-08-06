"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markPlanDayDone, loadPlanDayWindow } from "@/lib/actions/reading-plans";
import type { PlanDayDetail } from "@/lib/data/reading-plans";

const PAGE_SIZE = 100;

export function PlanDayList({
  planId,
  totalDays,
  initialFromDay,
  initialDays,
}: {
  planId: string;
  totalDays: number;
  initialFromDay: number;
  initialDays: PlanDayDetail[];
}) {
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(initialDays);
  const [loadedTo, setLoadedTo] = useState(initialFromDay + initialDays.length - 1);
  const [loadingMore, setLoadingMore] = useState(false);

  async function verMas() {
    setLoadingMore(true);
    const from = loadedTo + 1;
    const to = Math.min(totalDays, from + PAGE_SIZE - 1);
    const more = await loadPlanDayWindow(planId, from, to);
    setDays((cur) => [...cur, ...more]);
    setLoadedTo(to);
    setLoadingMore(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {initialFromDay > 1 && (
        <p className="text-xs text-foreground/50">
          Empezando en el día {initialFromDay} de {totalDays} (los anteriores ya están leídos).
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {days.map((d) => (
          <li key={d.dayNumber} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={d.completed}
              disabled={pending}
              onChange={() => startTransition(() => markPlanDayDone(planId, d.dayNumber))}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="w-10 shrink-0 text-right text-foreground/40">{d.dayNumber}.</span>
            <Link href={d.href} className="font-medium text-primary hover:underline">
              {d.bookName} {d.chapterNumber}
            </Link>
          </li>
        ))}
      </ul>
      {loadedTo < totalDays && (
        <button
          type="button"
          onClick={verMas}
          disabled={loadingMore}
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {loadingMore ? "Cargando..." : `Ver más (${totalDays - loadedTo} restantes)`}
        </button>
      )}
    </div>
  );
}
