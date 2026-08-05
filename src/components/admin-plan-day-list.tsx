"use client";

import { useTransition } from "react";
import { deletePlanDay } from "@/lib/actions/reading-plans";
import type { PlanDayDetail } from "@/lib/data/reading-plans";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function AdminPlanDayList({ planId, days }: { planId: string; days: PlanDayDetail[] }) {
  const [pending, startTransition] = useTransition();

  if (days.length === 0) {
    return <p className="text-sm text-foreground/50">Este plan todavía no tiene capítulos.</p>;
  }

  return (
    <ul className="flex max-h-[32rem] flex-col gap-1 overflow-y-auto">
      {days.map((d, i) => (
        <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
          <span>
            <span className="mr-2 text-foreground/40">{i + 1}.</span>
            {d.bookName} {d.chapterNumber}
          </span>
          <ConfirmDeleteButton
            onConfirm={() => startTransition(() => deletePlanDay(d.id, planId))}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          />
        </li>
      ))}
    </ul>
  );
}
