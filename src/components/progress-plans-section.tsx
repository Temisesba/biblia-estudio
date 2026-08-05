"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { enrollInPlan, loadPlanDetail, markPlanDayDone } from "@/lib/actions/reading-plans";
import type { PlanSummary, PlanDayDetail } from "@/lib/data/reading-plans";
import { CollapsibleSection } from "@/components/collapsible-section";

const PAGE_SIZE = 100;

function initialVisibleCount(days: PlanDayDetail[]) {
  const firstPending = days.findIndex((d) => !d.completed);
  const anchor = firstPending === -1 ? days.length : firstPending;
  return Math.min(days.length, Math.max(PAGE_SIZE, anchor + PAGE_SIZE));
}

export function ProgressPlansSection({ plans }: { plans: PlanSummary[] }) {
  return (
    <CollapsibleSection title="Planes de lectura">
      <div className="flex flex-col gap-2">
        {plans.length === 0 ? (
          <p className="text-sm text-foreground/50">Aún no hay planes de lectura publicados.</p>
        ) : (
          plans.map((p) => <PlanRow key={p.id} plan={p} />)
        )}
      </div>
    </CollapsibleSection>
  );
}

function PlanRow({ plan }: { plan: PlanSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [days, setDays] = useState<PlanDayDetail[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const pct = plan.totalDays > 0 ? Math.round((plan.completedDays / plan.totalDays) * 100) : 0;

  async function openAndLoad() {
    if (!expanded) {
      setExpanded(true);
      if (!days) {
        setLoading(true);
        const detail = await loadPlanDetail(plan.id);
        setDays(detail.days);
        setVisibleCount(initialVisibleCount(detail.days));
        setLoading(false);
      }
    } else {
      setExpanded(false);
    }
  }

  function start() {
    startTransition(async () => {
      await enrollInPlan(plan.id);
      await openAndLoad();
    });
  }

  const visible = days ? days.slice(0, visibleCount) : [];

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 p-3">
        <div>
          <p className="font-medium">{plan.name}</p>
          {plan.description && <p className="text-xs text-foreground/50">{plan.description}</p>}
          {plan.enrolled && (
            <p className="mt-1 text-xs text-foreground/40">
              {plan.completedDays} de {plan.totalDays} leídos ({pct}%)
            </p>
          )}
        </div>
        {plan.enrolled ? (
          <button
            type="button"
            onClick={openAndLoad}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            {expanded ? "Ocultar" : "Ver capítulos"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={start}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Empezar
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-border p-3">
          {loading && <p className="text-sm text-foreground/50">Cargando...</p>}
          {days && (
            <div className="flex flex-col gap-3">
              <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
                {visible.map((d, i) => (
                  <li key={d.dayNumber} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={d.completed}
                      onChange={() => {
                        setDays((cur) =>
                          cur ? cur.map((x) => (x.dayNumber === d.dayNumber ? { ...x, completed: !x.completed } : x)) : cur
                        );
                        startTransition(() => markPlanDayDone(plan.id, d.dayNumber));
                      }}
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
                  className="self-start rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Ver más ({days.length - visibleCount} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
