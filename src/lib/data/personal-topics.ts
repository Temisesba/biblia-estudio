import { createClient } from "@/lib/supabase/server";
import { BOOKS, slugify } from "@/lib/books-meta";
import type { PersonalTopic, PersonalVerseTopic } from "@/types/database";

export async function getAllPersonalTopics(userId: string): Promise<(PersonalTopic & { verseCount: number })[]> {
  const supabase = await createClient();
  const [{ data: topics }, { data: links }] = await Promise.all([
    supabase.from("personal_topics").select("*").eq("user_id", userId).order("name"),
    supabase.from("personal_verse_topics").select("personal_topic_id").eq("user_id", userId),
  ]);

  const counts = new Map<string, number>();
  for (const l of links ?? []) {
    counts.set(l.personal_topic_id as string, (counts.get(l.personal_topic_id as string) ?? 0) + 1);
  }

  return ((topics as PersonalTopic[]) ?? []).map((t) => ({ ...t, verseCount: counts.get(t.id) ?? 0 }));
}

export type ChapterPersonalTopicsMap = Record<
  number,
  (PersonalVerseTopic & { topicName: string; topicSlug: string })[]
>;

export async function getChapterPersonalTopics(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<ChapterPersonalTopicsMap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personal_verse_topics")
    .select("*, personal_topics(name, slug)")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);

  const map: ChapterPersonalTopicsMap = {};
  for (const row of data ?? []) {
    const topicInfo = row.personal_topics as unknown as { name: string; slug: string } | null;
    const entry = {
      ...(row as PersonalVerseTopic),
      topicName: topicInfo?.name ?? "—",
      topicSlug: topicInfo?.slug ?? "",
    };
    const verseNumber = row.verse_number as number;
    (map[verseNumber] ??= []).push(entry);
  }
  return map;
}

export interface PersonalTaggedVerse {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  topicName: string;
  href: string;
}

export async function getAllPersonalTaggedVerses(userId: string): Promise<PersonalTaggedVerse[]> {
  const supabase = await createClient();
  const [{ data: links }, { data: bookRows }] = await Promise.all([
    supabase.from("personal_verse_topics").select("*, personal_topics(name)").eq("user_id", userId),
    supabase.from("books").select("id, order"),
  ]);

  const idToOrder = new Map((bookRows ?? []).map((r) => [r.id as number, r.order as number]));

  return (links ?? []).map((l) => {
    const order = idToOrder.get(l.book_id as number);
    const book = BOOKS.find((b) => b.order === order);
    const topicInfo = l.personal_topics as unknown as { name: string } | null;
    return {
      bookName: book?.name ?? "—",
      chapterNumber: l.chapter_number as number,
      verseNumber: l.verse_number as number,
      topicName: topicInfo?.name ?? "—",
      href: book ? `/leer/${slugify(book.name)}/${l.chapter_number}` : "#",
    };
  });
}
