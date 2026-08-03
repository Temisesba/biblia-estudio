"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { loadTopicVerses } from "@/lib/actions/topics";
import type { TaggedVerse } from "@/lib/data/topics";
import type { Topic } from "@/types/database";

export function TopicsAccordion({ topics }: { topics: (Topic & { verseCount: number })[] }) {
  return (
    <div className="flex flex-col gap-2">
      {topics.map((t) => (
        <TopicRow key={t.id} topic={t} />
      ))}
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic & { verseCount: number } }) {
  const [open, setOpen] = useState(false);
  const [verses, setVerses] = useState<TaggedVerse[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!verses) {
      setLoading(true);
      const result = await loadTopicVerses(topic.slug);
      setVerses(result.verses);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-muted"
      >
        <span className="font-medium">
          #{topic.name} <span className="text-foreground/40">({topic.verseCount})</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="border-t border-border p-3">
          {loading && <p className="text-sm text-foreground/50">Cargando...</p>}
          {verses && verses.length === 0 && (
            <p className="text-sm text-foreground/50">Aún no hay versículos etiquetados con este tema.</p>
          )}
          {verses && verses.length > 0 && (
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
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
