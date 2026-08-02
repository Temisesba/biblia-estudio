import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getPlans } from "@/lib/data/reading-plans";
import { PlanCard } from "@/components/plan-card";

export default async function PlanesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const plans = await getPlans(profile.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Planes de lectura</h1>
      {plans.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Aún no hay planes de lectura publicados. Un administrador puede crear uno desde el panel de administración.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  );
}
