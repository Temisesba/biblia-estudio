import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { getPlanMeta, getPlanDayWindow } from "@/lib/data/reading-plans";
import { PlanDayList } from "@/components/plan-day-list";

const PAGE_SIZE = 100;

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const meta = await getPlanMeta(profile.id, id);
  if (!meta.plan) notFound();

  // Empieza justo antes del primer dia pendiente, para no tener que darle "Ver más" varias
  // veces si el plan es largo (como la "Lectura cronológica", con 1205 días) y ya vas
  // avanzado -- pero solo se pide esa ventana, nunca el plan completo de una sola vez.
  const fromDay = Math.max(1, meta.firstPendingDay - 5);
  const toDay = Math.min(meta.totalDays, fromDay + PAGE_SIZE - 1);
  const initialDays = await getPlanDayWindow(profile.id, id, fromDay, toDay);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/planes" className="text-sm text-primary hover:underline">
        ← Todos los planes
      </Link>
      <h1 className="text-xl font-semibold">{meta.plan.name}</h1>
      {meta.plan.description && <p className="text-sm text-foreground/60">{meta.plan.description}</p>}
      <PlanDayList
        planId={id}
        totalDays={meta.totalDays}
        initialFromDay={fromDay}
        initialDays={initialDays}
      />
    </div>
  );
}
