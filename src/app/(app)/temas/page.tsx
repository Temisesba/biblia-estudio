import { getAllTopics } from "@/lib/data/topics";
import { TopicsAccordion } from "@/components/topics-accordion";

export default async function TemasPage() {
  const topics = await getAllTopics();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Temas</h1>
        <p className="text-sm text-foreground/60">
          Explora pasajes por tema o situación de vida (duelo, esperanza, ansiedad, etc.).
        </p>
      </div>
      {topics.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Aún no hay temas creados. Un administrador puede etiquetar versículos desde el lector.
        </p>
      ) : (
        <TopicsAccordion topics={topics} />
      )}
    </div>
  );
}
