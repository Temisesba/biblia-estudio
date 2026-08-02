import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { getPlanDetail } from "@/lib/data/reading-plans";
import { PlanDayList } from "@/components/plan-day-list";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { plan, days } = await getPlanDetail(profile.id, id);
  if (!plan) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/planes" className="text-sm text-primary hover:underline">
        ← Todos los planes
      </Link>
      <h1 className="text-xl font-semibold">{plan.name}</h1>
      {plan.description && <p className="text-sm text-foreground/60">{plan.description}</p>}
      <PlanDayList planId={id} days={days} />
    </div>
  );
}
