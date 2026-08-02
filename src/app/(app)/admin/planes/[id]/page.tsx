import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { getPlanDetail } from "@/lib/data/reading-plans";
import { PlanPasteImporter } from "@/components/plan-paste-importer";
import { AdminPlanDayList } from "@/components/admin-plan-day-list";

export default async function AdminPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { plan, days } = await getPlanDetail(profile.id, id);
  if (!plan) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/planes" className="text-sm text-primary hover:underline">
        ← Todos los planes
      </Link>
      <h1 className="text-xl font-semibold">{plan.name}</h1>
      {plan.description && <p className="text-sm text-foreground/60">{plan.description}</p>}

      <PlanPasteImporter planId={id} />

      <div>
        <h2 className="mb-2 font-semibold">Capítulos en el plan ({days.length})</h2>
        <AdminPlanDayList planId={id} days={days} />
      </div>
    </div>
  );
}
