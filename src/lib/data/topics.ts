import { createClient } from "@/lib/supabase/server";
import { BOOKS, slugify } from "@/lib/books-meta";
import type { Topic, VerseTopic } from "@/types/database";

export async function getAllTopics(): Promise<(Topic & { verseCount: number })[]> {
  const supabase = await createClient();
  const [{ data: topics }, { data: links }] = await Promise.all([
    supabase.from("topics").select("*").order("name"),
    supabase.from("verse_topics").select("topic_id"),
  ]);

  const counts = new Map<string, number>();
  for (const l of links ?? []) {
    counts.set(l.topic_id as string, (counts.get(l.topic_id as string) ?? 0) + 1);
  }

  return ((topics as Topic[]) ?? []).map((t) => ({ ...t, verseCount: counts.get(t.id) ?? 0 }));
}

export interface ChapterVerseTopics {
  verse_number: number;
  topics: (VerseTopic & { topicName: string; topicSlug: string })[];
}

export type ChapterTopicsMap = Record<number, (VerseTopic & { topicName: string; topicSlug: string })[]>;

export async function getChapterTopics(bookId: number, chapterNumber: number): Promise<ChapterTopicsMap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verse_topics")
    .select("*, topics(name, slug)")
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);

  const map: ChapterTopicsMap = {};
  for (const row of data ?? []) {
    const topicInfo = row.topics as unknown as { name: string; slug: string } | null;
    const entry = {
      ...(row as VerseTopic),
      topicName: topicInfo?.name ?? "—",
      topicSlug: topicInfo?.slug ?? "",
    };
    const verseNumber = row.verse_number as number;
    (map[verseNumber] ??= []).push(entry);
  }
  return map;
}

export interface TaggedVerse {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string | null;
  href: string;
}

export async function getVersesByTopicSlug(
  slug: string
): Promise<{ topic: Topic | null; verses: TaggedVerse[] }> {
  const supabase = await createClient();
  const { data: topic } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
  if (!topic) return { topic: null, verses: [] };

  const [{ data: links }, { data: bookRows }] = await Promise.all([
    supabase.from("verse_topics").select("*").eq("topic_id", topic.id),
    supabase.from("books").select("id, order"),
  ]);

  const idToOrder = new Map((bookRows ?? []).map((r) => [r.id as number, r.order as number]));

  const verses = await Promise.all(
    (links ?? []).map(async (link) => {
      const order = idToOrder.get(link.book_id as number);
      const book = BOOKS.find((b) => b.order === order);
      const { data: verseRow } = await supabase
        .from("verses")
        .select("text")
        .eq("book_id", link.book_id as number)
        .eq("chapter_number", link.chapter_number as number)
        .eq("verse_number", link.verse_number as number)
        .maybeSingle();
      return {
        bookName: book?.name ?? "—",
        chapterNumber: link.chapter_number as number,
        verseNumber: link.verse_number as number,
        text: verseRow?.text ?? null,
        href: book ? `/leer/${slugify(book.name)}/${link.chapter_number}?v=${link.verse_number}` : "#",
      };
    })
  );

  return { topic: topic as Topic, verses };
}
