import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getProgressSummary } from "@/lib/data/progress-summary";
import { getAllUserProgress } from "@/lib/data/study";
import { getPlans } from "@/lib/data/reading-plans";
import { ProgressBar } from "@/components/progress-bar";
import { ReadingCalendar } from "@/components/reading-calendar";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ProgressPlansSection } from "@/components/progress-plans-section";
import { slugify } from "@/lib/books-meta";

export default async function ProgresoPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [summary, progress, plans] = await Promise.all([
    getProgressSummary(profile.id),
    getAllUserProgress(profile.id),
    getPlans(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Progreso de lectura</h1>
        <ReadingCalendar
          entries={progress.map((p) => ({
            book_name: p.book_name,
            chapter_number: p.chapter_number,
            read_at: p.first_read_at,
            href: `/leer/${slugify(p.book_name)}/${p.chapter_number}`,
          }))}
        />
      </div>

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

      <CollapsibleSection title="Progreso por libro">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summary.perBook.map((b) => (
            <Link key={b.order} href={`/leer/${slugify(b.name)}/1`} className="rounded-md border border-border p-3 hover:bg-muted">
              <ProgressBar label={b.name} read={b.read} total={b.total} />
            </Link>
          ))}
        </div>
      </CollapsibleSection>

      <ProgressPlansSection plans={plans} />
    </div>
  );
}
