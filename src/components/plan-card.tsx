"use client";

import { useTransition } from "react";
import Link from "next/link";
import { enrollInPlan } from "@/lib/actions/reading-plans";
import type { PlanSummary } from "@/lib/data/reading-plans";

export function PlanCard({ plan }: { plan: PlanSummary }) {
  const [pending, startTransition] = useTransition();
  const pct = plan.totalDays > 0 ? Math.round((plan.completedDays / plan.totalDays) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h3 className="font-semibold">{plan.name}</h3>
      {plan.description && <p className="text-sm text-foreground/60">{plan.description}</p>}
      <p className="text-xs text-foreground/40">{plan.totalDays} días</p>
      {plan.enrolled ? (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <Link href={`/planes/${plan.id}`} className="mt-1 text-sm font-medium text-primary hover:underline">
            Continuar plan ({pct}%)
          </Link>
        </>
      ) : (
        <button
          disabled={pending}
          onClick={() => startTransition(() => enrollInPlan(plan.id))}
          className="mt-1 self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Inscribirme
        </button>
      )}
    </div>
  );
}
