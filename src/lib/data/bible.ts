import { createClient } from "@/lib/supabase/server";
import { BOOKS, getBookBySlug } from "@/lib/books-meta";
import type {
  Verse,
  ChapterContext,
  Highlight,
  Note,
  Favorite,
  ReadingProgress,
} from "@/types/database";

export async function resolveBook(slug: string) {
  const meta = getBookBySlug(slug);
  if (!meta) return null;
  const supabase = await createClient();
  // Nota: "order" es un parámetro reservado en PostgREST (ORDER BY), así que no
  // se puede filtrar con .eq("order", ...) sobre una columna llamada "order" —
  // se trae la lista completa (66 filas) y se filtra en JS.
  const { data } = await supabase.from("books").select("id, order");
  const row = (data ?? []).find((b) => b.order === meta.order);
  return row ? { ...meta, id: row.id as number } : null;
}

export async function getChapterVerses(bookId: number, chapterNumber: number): Promise<Verse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verses")
    .select("*")
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .order("verse_number");
  return (data as Verse[]) ?? [];
}

export async function getChapterContext(
  bookId: number,
  chapterNumber: number
): Promise<ChapterContext | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contexts")
    .select("*")
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .maybeSingle();
  return (data as ChapterContext) ?? null;
}

export async function getUserHighlights(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<Highlight[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("highlights")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  return (data as Highlight[]) ?? [];
}

export async function getUserNotes(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<Note[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .order("created_at", { ascending: false });
  return (data as Note[]) ?? [];
}

export async function getUserFavorites(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<Favorite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  return (data as Favorite[]) ?? [];
}

export async function getUserChapterProgress(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<ReadingProgress | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .maybeSingle();
  return (data as ReadingProgress) ?? null;
}

export async function getBookIdMap(): Promise<Record<number, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("id, order");
  const map: Record<number, number> = {};
  for (const row of data ?? []) map[row.order as number] = row.id as number;
  return map;
}

export function neighborChapter(order: number, chapter: number, dir: 1 | -1) {
  const book = BOOKS.find((b) => b.order === order)!;
  let nextChapter = chapter + dir;
  let nextOrder = order;
  if (nextChapter < 1) {
    nextOrder = order - 1;
    if (nextOrder < 1) return null;
    nextChapter = BOOKS.find((b) => b.order === nextOrder)!.chapters;
  } else if (nextChapter > book.chapters) {
    nextOrder = order + 1;
    if (nextOrder > BOOKS.length) return null;
    nextChapter = 1;
  }
  const nextBook = BOOKS.find((b) => b.order === nextOrder)!;
  return { book: nextBook, chapter: nextChapter };
}
