"use client";

import { useTransition } from "react";
import Link from "next/link";
import { markPlanDayDone } from "@/lib/actions/reading-plans";
import type { PlanDayDetail } from "@/lib/data/reading-plans";

export function PlanDayList({ planId, days }: { planId: string; days: PlanDayDetail[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="flex flex-col gap-1">
      {days.map((d, i) => (
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
  );
}
