"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { enrollInPlan, loadPlanMeta, loadPlanDayWindow, markPlanDayDone } from "@/lib/actions/reading-plans";
import type { PlanSummary, PlanDayDetail } from "@/lib/data/reading-plans";
import { CollapsibleSection } from "@/components/collapsible-section";

const PAGE_SIZE = 100;

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
  const [totalDays, setTotalDays] = useState(0);
  const [loadedTo, setLoadedTo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const pct = plan.totalDays > 0 ? Math.round((plan.completedDays / plan.totalDays) * 100) : 0;

  async function openAndLoad() {
    if (!expanded) {
      setExpanded(true);
      if (!days) {
        setLoading(true);
        // Antes esto pedia el plan COMPLETO (getPlanDetail), lo cual era lento para un plan
        // largo como la "Lectura cronologica" (1205 dias) -- el primer clic ahora solo pide
        // los metadatos + una ventana chica de dias, sin importar el tamaño del plan.
        const meta = await loadPlanMeta(plan.id);
        const from = Math.max(1, meta.firstPendingDay - 5);
        const to = Math.min(meta.totalDays, from + PAGE_SIZE - 1);
        const firstWindow = await loadPlanDayWindow(plan.id, from, to);
        setDays(firstWindow);
        setTotalDays(meta.totalDays);
        setLoadedTo(to);
        setLoading(false);
      }
    } else {
      setExpanded(false);
    }
  }

  async function verMas() {
    setLoadingMore(true);
    const from = loadedTo + 1;
    const to = Math.min(totalDays, from + PAGE_SIZE - 1);
    const more = await loadPlanDayWindow(plan.id, from, to);
    setDays((cur) => (cur ? [...cur, ...more] : more));
    setLoadedTo(to);
    setLoadingMore(false);
  }

  function start() {
    startTransition(async () => {
      await enrollInPlan(plan.id);
      await openAndLoad();
    });
  }

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
                {days.map((d) => (
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
                  className="self-start rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {loadingMore ? "Cargando..." : `Ver más (${totalDays - loadedTo} restantes)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
