"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS, slugify as slugifyBookName } from "@/lib/books-meta";
import { getVersesByTopicSlug } from "@/lib/data/topics";

function chapterPath(bookOrder: number, chapterNumber: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  return `/leer/${book ? slugifyBookName(book.name) : bookOrder}/${chapterNumber}`;
}

export async function loadTopicVerses(slug: string) {
  return getVersesByTopicSlug(slug);
}

function slugifyTopic(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("No autorizado");
  return { supabase, userId: user.id };
}

export async function getOrCreateTopic(name: string) {
  const { supabase, userId } = await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre del tema no puede estar vacío");
  const slug = slugifyTopic(trimmed);

  const { data: existing } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("topics")
    .insert({ name: trimmed, slug, created_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function tagVerses(input: {
  topicId: string;
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseStart: number;
  verseEnd: number;
}) {
  const { supabase, userId } = await requireAdmin();
  const rows = [];
  for (let v = input.verseStart; v <= input.verseEnd; v++) {
    rows.push({
      topic_id: input.topicId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_number: v,
      created_by: userId,
    });
  }
  const { error } = await supabase
    .from("verse_topics")
    .upsert(rows, { onConflict: "topic_id,book_id,chapter_number,verse_number" });
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
}

export async function untagVerse(verseTopicId: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("verse_topics").delete().eq("id", verseTopicId);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/temas");
}

export async function bulkImportTopics(
  groups: {
    name: string;
    refs: { bookOrder: number; chapterNumber: number; verseStart: number; verseEnd: number | null }[];
  }[]
) {
  const { supabase, userId } = await requireAdmin();

  const { data: bookRows } = await supabase.from("books").select("id, order");
  const orderToId = new Map((bookRows ?? []).map((r) => [r.order as number, r.id as number]));

  // Cache de "ultimo versiculo del capitulo" para referencias sin numero de
  // versiculo (ej. "Salmo 88" = capitulo completo).
  const lastVerseCache = new Map<string, number>();
  async function lastVerseOf(bookId: number, chapterNumber: number): Promise<number> {
    const key = `${bookId}:${chapterNumber}`;
    const cached = lastVerseCache.get(key);
    if (cached) return cached;
    const { data } = await supabase
      .from("verses")
      .select("verse_number")
      .eq("book_id", bookId)
      .eq("chapter_number", chapterNumber)
      .order("verse_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const last = (data?.verse_number as number) ?? 1;
    lastVerseCache.set(key, last);
    return last;
  }

  let tagged = 0;
  for (const group of groups) {
    const trimmed = group.name.trim();
    if (!trimmed) continue;
    const slug = slugifyTopic(trimmed);

    const { data: existing } = await supabase.from("topics").select("id").eq("slug", slug).maybeSingle();
    let topicId = existing?.id as string | undefined;
    if (!topicId) {
      const { data: created, error: createError } = await supabase
        .from("topics")
        .insert({ name: trimmed, slug, created_by: userId })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      topicId = created.id as string;
    }

    const rows = [];
    for (const ref of group.refs) {
      const bookId = orderToId.get(ref.bookOrder);
      if (!bookId) continue;
      const verseEnd = ref.verseEnd ?? (await lastVerseOf(bookId, ref.chapterNumber));
      for (let v = ref.verseStart; v <= verseEnd; v++) {
        rows.push({
          topic_id: topicId,
          book_id: bookId,
          chapter_number: ref.chapterNumber,
          verse_number: v,
          created_by: userId,
        });
      }
    }
    if (rows.length === 0) continue;
    const { error } = await supabase
      .from("verse_topics")
      .upsert(rows, { onConflict: "topic_id,book_id,chapter_number,verse_number" });
    if (error) throw new Error(error.message);
    tagged += rows.length;
  }

  revalidatePath("/temas");
  return { tagged };
}
