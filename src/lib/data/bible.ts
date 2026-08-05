import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { BOOKS, getBookBySlug } from "@/lib/books-meta";
import type {
  Verse,
  ChapterContext,
  Highlight,
  Note,
  Favorite,
  ReadingProgress,
  PublicAnnotation,
  SectionTitle,
  ContextHighlight,
  ContextFavorite,
} from "@/types/database";

// La tabla "books" (66 filas) casi no cambia y es de lectura publica, pero se estaba
// volviendo a pedir a Supabase en mas de una docena de lugares del codigo (solo "Mi
// estudio" la pedia 6 veces por separado) — eso era gran parte de la lentitud al
// cambiar de pestana. Se centraliza aqui con cache de 1 hora compartida entre todos
// los usuarios, en vez de un viaje de red nuevo cada vez.
// Nota: "order" es un parametro reservado en PostgREST (ORDER BY), asi que no se puede
// filtrar con .eq("order", ...) sobre una columna llamada "order" — se trae la lista
// completa y se filtra/mapea en JS.
export const getBookOrderRows = unstable_cache(
  async (): Promise<{ id: number; order: number }[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("books").select("id, order");
    return (data ?? []) as { id: number; order: number }[];
  },
  ["book-order-rows"],
  { revalidate: 3600 }
);

export async function getBookOrderMap(): Promise<Map<number, number>> {
  const rows = await getBookOrderRows();
  return new Map(rows.map((r) => [r.id, r.order]));
}

export async function resolveBook(slug: string) {
  const meta = getBookBySlug(slug);
  if (!meta) return null;
  const rows = await getBookOrderRows();
  const row = rows.find((b) => b.order === meta.order);
  return row ? { ...meta, id: row.id } : null;
}

// Cacheadas: el texto bíblico y el contexto son de lectura pública (RLS
// permite anon) y casi no cambian, así que se pueden servir desde caché en
// vez de golpear Supabase en cada carga de capítulo. Los datos privados del
// usuario (resaltados, notas, progreso, favoritos) nunca se cachean.
const getChapterVersesCached = unstable_cache(
  async (bookId: number, chapterNumber: number): Promise<Verse[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("verses")
      .select("*")
      .eq("book_id", bookId)
      .eq("chapter_number", chapterNumber)
      .order("verse_number");
    return (data as Verse[]) ?? [];
  },
  ["chapter-verses"],
  { revalidate: 3600 }
);

export async function getChapterVerses(bookId: number, chapterNumber: number): Promise<Verse[]> {
  return getChapterVersesCached(bookId, chapterNumber);
}

const getChapterContextCached = unstable_cache(
  async (bookId: number, chapterNumber: number): Promise<ChapterContext | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("contexts")
      .select("*")
      .eq("book_id", bookId)
      .eq("chapter_number", chapterNumber)
      .maybeSingle();
    return (data as ChapterContext) ?? null;
  },
  ["chapter-context"],
  { revalidate: 300 }
);

export async function getChapterContext(
  bookId: number,
  chapterNumber: number
): Promise<ChapterContext | null> {
  return getChapterContextCached(bookId, chapterNumber);
}

const getChapterSectionTitlesCached = unstable_cache(
  async (bookId: number, chapterNumber: number): Promise<SectionTitle[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("section_titles")
      .select("*")
      .eq("book_id", bookId)
      .eq("chapter_number", chapterNumber)
      .order("verse_number");
    return (data as SectionTitle[]) ?? [];
  },
  ["chapter-section-titles"],
  { revalidate: 300 }
);

export async function getChapterSectionTitles(
  bookId: number,
  chapterNumber: number
): Promise<SectionTitle[]> {
  return getChapterSectionTitlesCached(bookId, chapterNumber);
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

export async function getPublicAnnotations(
  bookId: number,
  chapterNumber: number
): Promise<PublicAnnotation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_annotations")
    .select("*")
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  return (data as PublicAnnotation[]) ?? [];
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

export async function getContextHighlights(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<ContextHighlight[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("context_highlights")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  return (data as ContextHighlight[]) ?? [];
}

export async function getContextFavorites(
  userId: string,
  bookId: number,
  chapterNumber: number
): Promise<ContextFavorite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("context_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  return (data as ContextFavorite[]) ?? [];
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

export async function getReadChaptersMap(userId: string): Promise<Record<number, number[]>> {
  const supabase = await createClient();
  const [idToOrder, { data: progressRows }] = await Promise.all([
    getBookOrderMap(),
    supabase
      .from("reading_progress")
      .select("book_id, chapter_number")
      .eq("user_id", userId)
      .eq("status", "terminado"),
  ]);

  const map: Record<number, number[]> = {};
  for (const row of progressRows ?? []) {
    const order = idToOrder.get(row.book_id as number);
    if (order === undefined) continue;
    (map[order] ??= []).push(row.chapter_number as number);
  }
  return map;
}

export async function getBookIdMap(): Promise<Record<number, number>> {
  const rows = await getBookOrderRows();
  const map: Record<number, number> = {};
  for (const row of rows) map[row.order] = row.id;
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
