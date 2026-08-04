"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS } from "@/lib/books-meta";
import { slugify } from "@/lib/books-meta";

function chapterPath(bookOrder: number, chapter: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  return `/leer/${book ? slugify(book.name) : bookOrder}/${chapter}`;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

export async function createHighlight(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseStart: number;
  verseEnd: number;
  charStart: number | null;
  charEnd: number | null;
  selectedText: string;
  type: "resaltado" | "subrayado";
  color: string;
}) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("highlights")
    .insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_start: input.verseStart,
      verse_end: input.verseEnd,
      char_start: input.charStart,
      char_end: input.charEnd,
      selected_text: input.selectedText,
      type: input.type,
      color: input.color,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  return data;
}

export async function updateHighlight(
  id: string,
  changes: Partial<{ color: string; type: "resaltado" | "subrayado" }>,
  bookOrder: number,
  chapterNumber: number
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("highlights")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function deleteHighlight(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function createNote(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseNumber: number | null;
  highlightId: string | null;
  quotedText?: string | null;
  content: string;
  tags?: string[];
}) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_number: input.verseNumber,
      highlight_id: input.highlightId,
      quoted_text: input.quotedText ?? null,
      content: input.content,
      tags: input.tags ?? [],
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  return data;
}

export async function updateNote(
  id: string,
  content: string,
  bookOrder: number,
  chapterNumber: number,
  tags?: string[]
) {
  const { supabase } = await requireUser();
  const changes: Record<string, unknown> = { content, updated_at: new Date().toISOString() };
  if (tags !== undefined) changes.tags = tags;
  const { error } = await supabase.from("notes").update(changes).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function deleteNote(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function toggleFavorite(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseStart: number | null;
  verseEnd: number | null;
  existingId: string | null;
}) {
  const { supabase, userId } = await requireUser();
  if (input.existingId) {
    const { error } = await supabase.from("favorites").delete().eq("id", input.existingId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_start: input.verseStart,
      verse_end: input.verseEnd,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  revalidatePath("/mi-estudio");
}

// Nota: "order" es un parámetro reservado en PostgREST (usado para ORDER BY), así que
// no se puede filtrar con .eq("order", ...) sobre una columna llamada "order" — se trae
// la lista completa (66 filas) y se filtra en JS.
async function resolveBookId(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], bookOrder: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  if (!book) throw new Error("Libro no encontrado");
  const { data: allBooks } = await supabase.from("books").select("id, order");
  const bookRow = (allBooks ?? []).find((b) => b.order === bookOrder);
  if (!bookRow) throw new Error("Libro no sembrado en la base de datos");
  return bookRow.id as number;
}

export async function markChapterRead(bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const bookId = await resolveBookId(supabase, bookOrder);

  const { error } = await supabase.rpc("mark_chapter_read", {
    p_book_id: bookId,
    p_chapter_number: chapterNumber,
  });
  if (error) throw new Error(error.message);

  // Si este capitulo tambien es un dia de algun plan de lectura en el
  // que el usuario esta inscrito, marcar ese dia como leido tambien.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: enrollments } = await supabase
      .from("reading_plan_enrollments")
      .select("plan_id")
      .eq("user_id", user.id);
    const planIds = (enrollments ?? []).map((e) => e.plan_id as string);
    if (planIds.length > 0) {
      const { data: days } = await supabase
        .from("reading_plan_days")
        .select("plan_id, day_number")
        .eq("book_id", bookId)
        .eq("chapter_number", chapterNumber)
        .in("plan_id", planIds);
      if (days && days.length > 0) {
        await supabase
          .from("reading_plan_progress")
          .upsert(days.map((d) => ({ user_id: user.id, plan_id: d.plan_id as string, day_number: d.day_number as number })));
        for (const d of days) revalidatePath(`/planes/${d.plan_id}`);
      }
    }
  }

  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/mi-estudio");
  revalidatePath("/progreso");
}

// Desmarca el estado sin tocar el historial (veces leido, primera/ultima lectura):
// "leido" es un estado que se puede prender y apagar, pero cuantas veces lo leiste
// y cuando ya sucedieron y no deberian borrarse por desmarcar la casilla.
export async function unmarkChapterRead(bookOrder: number, chapterNumber: number) {
  const { supabase, userId } = await requireUser();
  const bookId = await resolveBookId(supabase, bookOrder);

  const { error } = await supabase
    .from("reading_progress")
    .update({ status: "pendiente" })
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  if (error) throw new Error(error.message);

  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/mi-estudio");
  revalidatePath("/progreso");
}

// Permite corregir la fecha de "primera lectura" (la que ancla el capitulo en el
// calendario de Progreso) para capitulos que se leyeron antes de usar la app.
export async function updateReadingProgressDate(bookOrder: number, chapterNumber: number, isoDate: string) {
  const { supabase, userId } = await requireUser();
  const bookId = await resolveBookId(supabase, bookOrder);
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha invalida");

  const { error } = await supabase
    .from("reading_progress")
    .update({ first_read_at: date.toISOString() })
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber);
  if (error) throw new Error(error.message);

  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/progreso");
}
