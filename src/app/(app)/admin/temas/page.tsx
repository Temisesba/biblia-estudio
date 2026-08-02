import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getAllTopics } from "@/lib/data/topics";
import { TopicsPasteImporter } from "@/components/topics-paste-importer";

export default async function AdminTemasPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/leer");

  const topics = await getAllTopics();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Temas</h1>
      <TopicsPasteImporter />

      <div>
        <h2 className="mb-2 font-semibold">Temas existentes ({topics.length})</h2>
        {topics.length === 0 ? (
          <p className="text-sm text-foreground/50">Aún no hay temas creados.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <li key={t.id}>
                <Link href={`/temas/${t.slug}`} className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-muted">
                  <span className="font-medium">#{t.name}</span>
                  <span className="text-foreground/40">{t.verseCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
