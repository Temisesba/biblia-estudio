"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markPlanDayDone } from "@/lib/actions/reading-plans";
import type { PlanDayDetail } from "@/lib/data/reading-plans";

const PAGE_SIZE = 100;

// Un plan largo (la "Lectura cronológica" tiene 1205 días) pintaba TODAS las filas de una
// vez -- son 1205 nodos con checkbox + link, lo cual es lento de renderizar/hidratar. Ahora
// se muestra una tanda a la vez, empezando justo despues del ultimo dia leido (para no
// tener que darle "Ver más" varias veces si ya vas avanzado en el plan).
function initialVisibleCount(days: PlanDayDetail[]) {
  const firstPending = days.findIndex((d) => !d.completed);
  const anchor = firstPending === -1 ? days.length : firstPending;
  return Math.min(days.length, Math.max(PAGE_SIZE, anchor + PAGE_SIZE));
}

export function PlanDayList({ planId, days }: { planId: string; days: PlanDayDetail[] }) {
  const [pending, startTransition] = useTransition();
  const [visibleCount, setVisibleCount] = useState(() => initialVisibleCount(days));
  const visible = days.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1">
        {visible.map((d, i) => (
          <li key={d.dayNumber} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={d.completed}
              disabled={pending}
              onChange={() => startTransition(() => markPlanDayDone(planId, d.dayNumber))}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="w-8 shrink-0 text-right text-foreground/40">{i + 1}.</span>
            <Link href={d.href} className="font-medium text-primary hover:underline">
              {d.bookName} {d.chapterNumber}
            </Link>
          </li>
        ))}
      </ul>
      {visibleCount < days.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => Math.min(days.length, c + PAGE_SIZE))}
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Ver más ({days.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
}
