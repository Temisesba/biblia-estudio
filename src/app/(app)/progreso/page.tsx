import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getProgressSummary } from "@/lib/data/progress-summary";
import { ProgressBar } from "@/components/progress-bar";
import { slugify } from "@/lib/books-meta";

export default async function ProgresoPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const summary = await getProgressSummary(profile.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Progreso de lectura</h1>
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <ProgressBar label="Biblia completa" read={summary.readChapters} total={summary.totalChapters} />
          <ProgressBar
            label="Antiguo Testamento"
            read={summary.perTestament.AT.read}
            total={summary.perTestament.AT.total}
          />
          <ProgressBar
            label="Nuevo Testamento"
            read={summary.perTestament.NT.read}
            total={summary.perTestament.NT.total}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Progreso por libro</h2>
        <Link href="/planes" className="text-sm text-primary hover:underline">
          Ver planes de lectura →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summary.perBook.map((b) => (
          <Link key={b.order} href={`/leer/${slugify(b.name)}/1`} className="rounded-md border border-border p-3 hover:bg-muted">
            <ProgressBar label={b.name} read={b.read} total={b.total} />
          </Link>
        ))}
      </div>
    </div>
  );
}
