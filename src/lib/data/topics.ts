import { createClient } from "@/lib/supabase/server";
import { BOOKS, slugify } from "@/lib/books-meta";
import { getBookOrderMap } from "@/lib/data/bible";
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

  // Se trae el tema y sus versiculos ligados en una sola ida y vuelta
  // (join embebido de PostgREST) en vez de dos consultas seguidas.
  const [{ data: linkRows }, idToOrder] = await Promise.all([
    supabase.from("verse_topics").select("*, topics!inner(*)").eq("topics.slug", slug),
    getBookOrderMap(),
  ]);

  if (!linkRows || linkRows.length === 0) {
    const { data: topicOnly } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
    return { topic: (topicOnly as Topic) ?? null, verses: [] };
  }

  const topic = (linkRows[0] as unknown as { topics: Topic }).topics;
  const links = linkRows as unknown as VerseTopic[];

  // Una sola consulta con todos los versiculos en vez de una por versiculo
  // (antes eran N ida-y-vueltas a Supabase, aqui es solo una).
  const textByKey = new Map<string, string>();
  const filter = links
    .map((l) => `and(book_id.eq.${l.book_id},chapter_number.eq.${l.chapter_number},verse_number.eq.${l.verse_number})`)
    .join(",");
  const { data: verseRows } = await supabase.from("verses").select("book_id, chapter_number, verse_number, text").or(filter);
  for (const row of verseRows ?? []) {
    textByKey.set(`${row.book_id}:${row.chapter_number}:${row.verse_number}`, row.text as string);
  }

  const verses: TaggedVerse[] = (links ?? []).map((link) => {
    const order = idToOrder.get(link.book_id as number);
    const book = BOOKS.find((b) => b.order === order);
    const key = `${link.book_id}:${link.chapter_number}:${link.verse_number}`;
    return {
      bookName: book?.name ?? "—",
      chapterNumber: link.chapter_number as number,
      verseNumber: link.verse_number as number,
      text: textByKey.get(key) ?? null,
      href: book ? `/leer/${slugify(book.name)}/${link.chapter_number}?v=${link.verse_number}` : "#",
    };
  });

  return { topic: topic as Topic, verses };
}
