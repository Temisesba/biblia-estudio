import { createClient } from "@/lib/supabase/server";
import { AppUpdateButton } from "@/components/app-update-button";
import { ImprovementNotesPanel } from "@/components/improvement-notes-panel";
import { getImprovementNotes } from "@/lib/data/admin";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const [{ count: users }, { count: verses }, { count: contexts }, improvementNotes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("verses").select("*", { count: "exact", head: true }),
    supabase.from("contexts").select("*", { count: "exact", head: true }),
    getImprovementNotes(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Panel de administración</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Usuarios registrados" value={users ?? 0} />
        <Card label="Versículos cargados" value={verses ?? 0} />
        <Card label="Capítulos con contexto" value={contexts ?? 0} />
      </div>
      <AppUpdateButton />
      <ImprovementNotesPanel notes={improvementNotes} />
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-foreground/50">{label}</p>
      <p className="text-2xl font-semibold">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}
