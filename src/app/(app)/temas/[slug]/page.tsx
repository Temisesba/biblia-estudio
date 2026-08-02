import Link from "next/link";
import { notFound } from "next/navigation";
import { getVersesByTopicSlug } from "@/lib/data/topics";

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { topic, verses } = await getVersesByTopicSlug(slug);
  if (!topic) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/temas" className="text-sm text-primary hover:underline">
        ← Todos los temas
      </Link>
      <h1 className="text-xl font-semibold">#{topic.name}</h1>
      <ul className="flex flex-col gap-2">
        {verses.map((v, i) => (
          <li key={i}>
            <Link href={v.href} className="block rounded-md border border-border p-3 text-sm hover:bg-muted">
              <span className="font-medium text-primary">
                {v.bookName} {v.chapterNumber}:{v.verseNumber}
              </span>
              {v.text && <p className="mt-1 text-foreground/80">{v.text}</p>}
            </Link>
          </li>
        ))}
        {verses.length === 0 && (
          <p className="text-sm text-foreground/50">Aún no hay versículos etiquetados con este tema.</p>
        )}
      </ul>
    </div>
  );
}
