import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { getPlans } from "@/lib/data/reading-plans";
import { CreatePlanForm } from "@/components/create-plan-form";

export default async function AdminPlanesPage() {
  const profile = await getCurrentProfile();
  const plans = profile ? await getPlans(profile.id) : [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Planes de lectura</h1>
      <CreatePlanForm />
      <div className="flex flex-col gap-2">
        {plans.map((p) => (
          <Link
            key={p.id}
            href={`/admin/planes/${p.id}`}
            className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-muted"
          >
            <span className="font-medium">{p.name}</span>
            <span className="text-foreground/50">{p.totalDays} capítulos</span>
          </Link>
        ))}
        {plans.length === 0 && <p className="text-sm text-foreground/50">Aún no hay planes creados.</p>}
      </div>
    </div>
  );
}
